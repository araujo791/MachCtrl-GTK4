mod cleaner;
mod gpu;
mod hwmon;
mod memory;
mod power;
mod procstat;
mod profiles;

use adw::prelude::*;
use gtk::glib;
use std::cell::RefCell;
use std::collections::VecDeque;
use std::rc::Rc;

const HISTORY_LEN: usize = 40;

const APP_NAME: &str = "MachCtrl";
const APP_VERSION: &str = "v0.1 (Rust nativo)";

// --- estado compartilhado entre o loop de 1s e os widgets ---

struct AppState {
    prev_cpu_overall: procstat::CpuTimes,
    prev_cpu_cores: std::collections::HashMap<usize, procstat::CpuTimes>,
    rapl: power::RaplReader,
    prev_net: Vec<procstat::NetAdapter>,
    cpu_page_hist: VecDeque<f32>,
}

impl AppState {
    fn new() -> Self {
        let (overall, cores) = procstat::read_cpu_times();
        Self {
            prev_cpu_overall: overall,
            prev_cpu_cores: cores,
            rapl: power::RaplReader::new(),
            prev_net: procstat::read_net_counters(),
            cpu_page_hist: VecDeque::new(),
        }
    }
}

fn push_history(h: &Rc<RefCell<VecDeque<f32>>>, v: f32) {
    let mut h = h.borrow_mut();
    h.push_back(v);
    if h.len() > HISTORY_LEN {
        h.pop_front();
    }
}

/// Gráfico de linha (sparkline) vivo: lê de um buffer compartilhado, então quem atualiza
/// os dados precisa chamar `.queue_draw()` na DrawingArea retornada pra redesenhar.
fn build_sparkline(history: Rc<RefCell<VecDeque<f32>>>, rgb: (f64, f64, f64)) -> gtk::DrawingArea {
    let da = gtk::DrawingArea::new();
    da.set_content_height(44);
    da.set_hexpand(true);
    da.set_draw_func(move |_, cr, w, h| {
        let data = history.borrow();
        if data.len() < 2 {
            return;
        }
        let w = w as f64;
        let h = h as f64;
        let n = data.len();
        let step = w / (n as f64 - 1.0);
        let y_of = |v: f32| h - ((v as f64 / 100.0).clamp(0.0, 1.0) * (h - 2.0)) - 1.0;

        cr.move_to(0.0, y_of(data[0]));
        for (i, v) in data.iter().enumerate().skip(1) {
            cr.line_to(i as f64 * step, y_of(*v));
        }
        cr.set_line_width(2.0);
        cr.set_source_rgba(rgb.0, rgb.1, rgb.2, 1.0);
        let _ = cr.stroke_preserve();

        cr.line_to(w, h);
        cr.line_to(0.0, h);
        cr.close_path();
        cr.set_source_rgba(rgb.0, rgb.1, rgb.2, 0.12);
        let _ = cr.fill();
    });
    da
}

/// Versão "estática": usada em páginas que são reconstruídas do zero a cada tick (como a
/// de CPU), onde não vale a pena montar um buffer compartilhado — os dados já vêm prontos.
fn build_sparkline_snapshot(data: Vec<f32>, rgb: (f64, f64, f64)) -> gtk::DrawingArea {
    let history = Rc::new(RefCell::new(VecDeque::from(data)));
    build_sparkline(history, rgb)
}

/// Tenta mapear temperaturas "Core N" (coretemp/k10temp) para cada CPU lógico, assumindo
/// hyperthreading/SMT uniforme (threads_per_core = núcleos lógicos / núcleos físicos com
/// sensor). Aproximação razoável já que /proc não expõe essa topologia diretamente.
fn build_core_temp_map(temps: &[hwmon::TempSensor], core_count: usize) -> Vec<Option<f64>> {
    let mut core_temps: Vec<(usize, f64)> = temps
        .iter()
        .filter_map(|t| {
            t.label
                .to_lowercase()
                .strip_prefix("core ")
                .and_then(|n| n.trim().parse::<usize>().ok())
                .map(|n| (n, t.value_c))
        })
        .collect();
    core_temps.sort_by_key(|(n, _)| *n);

    let mut map = vec![None; core_count];
    if core_temps.is_empty() {
        return map;
    }
    let threads_per_core = (core_count / core_temps.len()).max(1);
    for (phys_idx, temp) in &core_temps {
        for t in 0..threads_per_core {
            let logical = phys_idx * threads_per_core + t;
            if logical < core_count {
                map[logical] = Some(*temp);
            }
        }
    }
    map
}

fn temp_css_class(temp_c: f64) -> &'static str {
    if temp_c >= 80.0 {
        "temp-hot"
    } else if temp_c >= 60.0 {
        "temp-warm"
    } else {
        "temp-cool"
    }
}

// --- helpers de construção de UI ---

fn card(child: &impl IsA<gtk::Widget>) -> gtk::Box {
    let b = gtk::Box::new(gtk::Orientation::Vertical, 8);
    b.add_css_class("card");
    b.append(child);
    b
}

fn stat_row(label: &str, value_widget: &impl IsA<gtk::Widget>) -> gtk::Box {
    let row = gtk::Box::new(gtk::Orientation::Horizontal, 0);
    let l = gtk::Label::new(Some(label));
    l.set_halign(gtk::Align::Start);
    l.set_hexpand(true);
    l.add_css_class("stat-gray");
    row.append(&l);
    row.append(value_widget);
    row
}

fn stat_label(text: &str, css: &str) -> gtk::Label {
    let l = gtk::Label::new(Some(text));
    l.add_css_class(css);
    l
}

fn page_header(title: &str, subtitle_box: &gtk::Box) -> gtk::Box {
    let header = gtk::Box::new(gtk::Orientation::Vertical, 2);
    header.set_margin_top(24);
    header.set_margin_start(28);
    header.set_margin_bottom(16);
    let t = gtk::Label::new(Some(title));
    t.add_css_class("page-title");
    t.set_halign(gtk::Align::Start);
    header.append(&t);
    header.append(subtitle_box);
    header
}

fn subtitle_box() -> gtk::Box {
    let hostname = procstat::read_hostname();
    let uptime = procstat::read_uptime_human();
    let b = gtk::Box::new(gtk::Orientation::Horizontal, 0);
    let l = gtk::Label::new(Some(&format!("{hostname} · CachyOS · Uptime {uptime}")));
    l.add_css_class("page-subtitle");
    l.set_halign(gtk::Align::Start);
    b.append(&l);
    b
}

// --- página: Visão Geral ---

struct OverviewWidgets {
    ram_pct: gtk::Label,
    ram_used: gtk::Label,
    cpu_usage: gtk::Label,
    cpu_temp: gtk::Label,
    cpu_freq: gtk::Label,
    gpu_card: gtk::Box,
    disk_card: gtk::Box,
    net_card: gtk::Box,
    cpu_spark: gtk::DrawingArea,
    cpu_hist: Rc<RefCell<VecDeque<f32>>>,
    ram_spark: gtk::DrawingArea,
    ram_hist: Rc<RefCell<VecDeque<f32>>>,
    gpu_spark: gtk::DrawingArea,
    gpu_hist: Rc<RefCell<VecDeque<f32>>>,
}

fn build_overview_page() -> (gtk::Box, OverviewWidgets) {
    let page = gtk::Box::new(gtk::Orientation::Vertical, 16);
    page.set_margin_end(28);

    let grid = gtk::Box::new(gtk::Orientation::Horizontal, 16);
    grid.set_homogeneous(true);

    // CPU card
    let cpu_inner = gtk::Box::new(gtk::Orientation::Vertical, 8);
    let cpu_title = gtk::Label::new(Some("CPU"));
    cpu_title.add_css_class("card-title");
    cpu_title.set_halign(gtk::Align::Start);
    cpu_inner.append(&cpu_title);
    let cpu_usage = stat_label("0%", "stat-blue");
    let cpu_temp = stat_label("—", "stat-green");
    let cpu_freq = stat_label("—", "stat-gray");
    cpu_inner.append(&stat_row("Uso médio", &cpu_usage));
    cpu_inner.append(&stat_row("Temperatura", &cpu_temp));
    cpu_inner.append(&stat_row("Frequência", &cpu_freq));
    let cpu_hist = Rc::new(RefCell::new(VecDeque::new()));
    let cpu_spark = build_sparkline(cpu_hist.clone(), (0.145, 0.388, 0.922));
    cpu_inner.append(&cpu_spark);
    grid.append(&card(&cpu_inner));

    // RAM card
    let ram_inner = gtk::Box::new(gtk::Orientation::Vertical, 8);
    let ram_title = gtk::Label::new(Some("MEMÓRIA RAM"));
    ram_title.add_css_class("card-title");
    ram_title.set_halign(gtk::Align::Start);
    ram_inner.append(&ram_title);
    let ram_pct = stat_label("0%", "stat-blue");
    let ram_used = stat_label("—", "stat-gray");
    ram_inner.append(&stat_row("Uso", &ram_pct));
    ram_inner.append(&stat_row("Em uso / Total", &ram_used));
    let ram_hist = Rc::new(RefCell::new(VecDeque::new()));
    let ram_spark = build_sparkline(ram_hist.clone(), (0.086, 0.639, 0.290));
    ram_inner.append(&ram_spark);
    grid.append(&card(&ram_inner));

    // GPU card (conteúdo populado no refresh, pois depende do vendor detectado)
    let gpu_inner = gtk::Box::new(gtk::Orientation::Vertical, 8);
    let gpu_hist = Rc::new(RefCell::new(VecDeque::new()));
    let gpu_spark = build_sparkline(gpu_hist.clone(), (0.749, 0.353, 0.949));
    grid.append(&card(&gpu_inner));

    page.append(&grid);

    let grid2 = gtk::Box::new(gtk::Orientation::Horizontal, 16);
    grid2.set_homogeneous(true);

    let disk_inner = gtk::Box::new(gtk::Orientation::Vertical, 8);
    grid2.append(&card(&disk_inner));

    let net_inner = gtk::Box::new(gtk::Orientation::Vertical, 8);
    grid2.append(&card(&net_inner));

    page.append(&grid2);

    (
        page,
        OverviewWidgets {
            ram_pct,
            ram_used,
            cpu_usage,
            cpu_temp,
            cpu_freq,
            gpu_card: gpu_inner,
            disk_card: disk_inner,
            net_card: net_inner,
            cpu_spark,
            cpu_hist,
            ram_spark,
            ram_hist,
            gpu_spark,
            gpu_hist,
        },
    )
}

fn clear_box(b: &gtk::Box) {
    while let Some(child) = b.first_child() {
        b.remove(&child);
    }
}

fn refresh_overview(w: &OverviewWidgets, state: &mut AppState) {
    let mem = procstat::read_meminfo();
    w.ram_pct.set_text(&format!("{:.0}%", mem.usage_pct));
    w.ram_used.set_text(&format!("{:.1} / {:.1} GB", mem.used_gb, mem.total_gb));

    let (overall, cores) = procstat::read_cpu_times();
    let usage = procstat::usage_pct(&state.prev_cpu_overall, &overall);
    state.prev_cpu_overall = overall;
    state.prev_cpu_cores = cores;
    w.cpu_usage.set_text(&format!("{usage:.0}%"));
    w.cpu_freq.set_text(&format!("{} MHz", procstat::read_cpu_freq_mhz()));
    push_history(&w.cpu_hist, usage);
    w.cpu_spark.queue_draw();
    push_history(&w.ram_hist, mem.usage_pct as f32);
    w.ram_spark.queue_draw();

    let (temps, fans) = hwmon::read_all_temps_and_fans();
    let cpu_temp = temps
        .iter()
        .find(|t| t.label.to_lowercase().contains("tctl") || t.label.to_lowercase().contains("package"))
        .or_else(|| temps.first())
        .map(|t| t.value_c);
    w.cpu_temp.set_text(&cpu_temp.map(|t| format!("{t:.0}°C")).unwrap_or_else(|| "—".into()));
    let _ = fans; // usado na página de Fans

    clear_box(&w.gpu_card);
    let gpus = gpu::read_all_gpus();
    let gpu_title_text = if gpus.is_empty() { "GPU".to_string() } else { gpus[0].name.to_uppercase() };
    let gtitle = gtk::Label::new(Some(&gpu_title_text));
    gtitle.add_css_class("card-title");
    gtitle.set_halign(gtk::Align::Start);
    w.gpu_card.append(&gtitle);
    if let Some(g) = gpus.first() {
        w.gpu_card.append(&stat_row("Uso", &stat_label(&g.usage_pct.map(|v| format!("{v:.0}%")).unwrap_or_else(|| "—".into()), "stat-blue")));
        w.gpu_card.append(&stat_row("Temperatura", &stat_label(&g.temp_c.map(|v| format!("{v:.0}°C")).unwrap_or_else(|| "—".into()), "stat-green")));
        let vram = match (g.vram_used_mb, g.vram_total_mb) {
            (Some(u), Some(t)) => format!("{:.1} / {:.1} GB", u / 1024.0, t / 1024.0),
            _ => "—".into(),
        };
        w.gpu_card.append(&stat_row("VRAM", &stat_label(&vram, "stat-gray")));
    } else {
        w.gpu_card.append(&gtk::Label::new(Some("Nenhuma GPU detectada")));
    }
    push_history(&w.gpu_hist, gpus.first().and_then(|g| g.usage_pct).unwrap_or(0.0) as f32);
    w.gpu_card.append(&w.gpu_spark);
    w.gpu_spark.queue_draw();

    clear_box(&w.disk_card);
    let dtitle = gtk::Label::new(Some("DISCO DO SISTEMA"));
    dtitle.add_css_class("card-title");
    dtitle.set_halign(gtk::Align::Start);
    w.disk_card.append(&dtitle);
    if let Some(d) = procstat::read_disks().into_iter().find(|d| d.mountpoint == "/") {
        w.disk_card.append(&stat_row("Uso", &stat_label(&format!("{:.0}%", d.usage_pct), "stat-blue")));
        w.disk_card.append(&stat_row("Livre", &stat_label(&format!("{:.1} GB", d.free_gb), "stat-gray")));
        w.disk_card.append(&stat_row("Total", &stat_label(&format!("{:.1} GB", d.total_gb), "stat-gray")));
        w.disk_card.append(&stat_row("Tipo", &stat_label(&d.fstype, "stat-gray")));
    }

    clear_box(&w.net_card);
    let ntitle = gtk::Label::new(Some("REDE"));
    ntitle.add_css_class("card-title");
    ntitle.set_halign(gtk::Align::Start);
    w.net_card.append(&ntitle);
    let current_net = procstat::read_net_counters();
    for adapter in &current_net {
        let prev = state.prev_net.iter().find(|p| p.name == adapter.name);
        let (down_kb, up_kb) = match prev {
            Some(p) => (
                (adapter.rx_bytes.saturating_sub(p.rx_bytes)) as f64 / 1024.0,
                (adapter.tx_bytes.saturating_sub(p.tx_bytes)) as f64 / 1024.0,
            ),
            None => (0.0, 0.0),
        };
        let row = gtk::Box::new(gtk::Orientation::Vertical, 2);
        let name_lbl = gtk::Label::new(Some(&adapter.name));
        name_lbl.set_halign(gtk::Align::Start);
        name_lbl.add_css_class("stat-gray");
        row.append(&name_lbl);
        row.append(&stat_row("Download", &stat_label(&format!("{down_kb:.0} KB/s"), "stat-blue")));
        row.append(&stat_row("Upload", &stat_label(&format!("{up_kb:.0} KB/s"), "stat-blue")));
        w.net_card.append(&row);
    }
    state.prev_net = current_net;
}

// --- página: CPU (grid de núcleos) ---

fn build_cpu_page() -> (gtk::Box, gtk::Box) {
    let page = gtk::Box::new(gtk::Orientation::Vertical, 16);
    page.set_margin_end(28);
    let container = gtk::Box::new(gtk::Orientation::Vertical, 16);
    page.append(&container);
    (page, container)
}

fn refresh_cpu_page(container: &gtk::Box, state: &mut AppState) {
    clear_box(container);

    let (overall, cores) = procstat::read_cpu_times();
    let usage = procstat::usage_pct(&state.prev_cpu_overall, &overall);
    let model = procstat::read_cpu_model();
    let freq = procstat::read_cpu_freq_mhz();
    let (temps, _) = hwmon::read_all_temps_and_fans();
    let pkg_temp = temps
        .iter()
        .find(|t| t.label.to_lowercase().contains("tctl") || t.label.to_lowercase().contains("package"))
        .or_else(|| temps.first())
        .map(|t| t.value_c);

    let inner = gtk::Box::new(gtk::Orientation::Vertical, 12);
    inner.add_css_class("card");

    let header_row = gtk::Box::new(gtk::Orientation::Horizontal, 0);
    let model_box = gtk::Box::new(gtk::Orientation::Vertical, 2);
    let model_lbl = gtk::Label::new(Some(&model));
    model_lbl.set_halign(gtk::Align::Start);
    model_lbl.add_css_class("card-title");
    model_box.append(&model_lbl);
    let sub_lbl = gtk::Label::new(Some(&format!("{} núcleos (lógicos)", procstat::cpu_core_count())));
    sub_lbl.set_halign(gtk::Align::Start);
    sub_lbl.add_css_class("stat-gray");
    model_box.append(&sub_lbl);
    model_box.set_hexpand(true);
    header_row.append(&model_box);

    header_row.set_spacing(24);
    header_row.append(&stat_row("Uso médio", &stat_label(&format!("{usage:.0}%"), "stat-blue")));
    header_row.append(&stat_row("Temp", &stat_label(&pkg_temp.map(|t| format!("{t:.0}°C")).unwrap_or_else(|| "—".into()), "stat-green")));
    header_row.append(&stat_row("Freq", &stat_label(&format!("{freq} MHz"), "stat-gray")));
    inner.append(&header_row);

    state.cpu_page_hist.push_back(usage);
    if state.cpu_page_hist.len() > HISTORY_LEN {
        state.cpu_page_hist.pop_front();
    }
    let spark = build_sparkline_snapshot(state.cpu_page_hist.iter().copied().collect(), (0.145, 0.388, 0.922));
    inner.append(&spark);

    let core_temp_map = build_core_temp_map(&temps, procstat::cpu_core_count());

    let flow = gtk::FlowBox::new();
    flow.set_selection_mode(gtk::SelectionMode::None);
    flow.set_max_children_per_line(16);
    flow.set_row_spacing(6);
    flow.set_column_spacing(6);

    let mut core_ids: Vec<usize> = cores.keys().copied().collect();
    core_ids.sort();
    for id in core_ids {
        let cur = cores[&id];
        let prev = state.prev_cpu_cores.get(&id).copied().unwrap_or_default();
        let pct = procstat::usage_pct(&prev, &cur);
        let core_temp = core_temp_map.get(id).copied().flatten();

        let cell = gtk::Box::new(gtk::Orientation::Vertical, 0);
        cell.add_css_class("core-cell");
        let pct_lbl = gtk::Label::new(Some(&format!("{pct:.0}%")));
        pct_lbl.add_css_class(if pct > 70.0 { "stat-orange" } else { "stat-blue" });
        let id_lbl = gtk::Label::new(Some(&format!("T{id}")));
        id_lbl.add_css_class("stat-gray");
        cell.append(&pct_lbl);
        cell.append(&id_lbl);

        // Barra de temperatura: pequena faixa colorida no rodapé da célula, igual ao
        // indicador laranja/verde da v2.0 (verde = frio, laranja/vermelho = quente).
        let temp_bar = gtk::Box::new(gtk::Orientation::Horizontal, 0);
        temp_bar.set_size_request(-1, 3);
        temp_bar.set_margin_top(4);
        if let Some(t) = core_temp {
            temp_bar.add_css_class(temp_css_class(t));
        } else {
            temp_bar.add_css_class("temp-unknown");
        }
        cell.append(&temp_bar);

        flow.insert(&cell, -1);
    }
    inner.append(&flow);
    container.append(&inner);

    state.prev_cpu_overall = overall;
    state.prev_cpu_cores = cores;
}

// --- página: Fans ---

fn build_fans_page() -> (gtk::Box, gtk::Box) {
    let page = gtk::Box::new(gtk::Orientation::Vertical, 12);
    page.set_margin_end(28);
    let container = gtk::Box::new(gtk::Orientation::Vertical, 12);
    page.append(&container);
    (page, container)
}

fn refresh_fans_page(container: &gtk::Box) {
    clear_box(container);

    let (_, fans) = hwmon::read_all_temps_and_fans();

    if fans.is_empty() {
        let empty = build_placeholder_page(
            "Nenhum fan detectado",
            "Não foi possível ler sensores de fan via /sys/class/hwmon neste sistema.",
        );
        container.append(&empty);
        return;
    }

    for fan in fans {
        let row = gtk::Box::new(gtk::Orientation::Vertical, 8);
        row.add_css_class("card");

        let top = gtk::Box::new(gtk::Orientation::Horizontal, 12);
        let left = gtk::Box::new(gtk::Orientation::Vertical, 2);
        let title = gtk::Label::new(Some(&fan.label));
        title.add_css_class("card-title");
        title.set_halign(gtk::Align::Start);
        left.append(&title);
        let chip_lbl = gtk::Label::new(Some(&fan.chip));
        chip_lbl.add_css_class("stat-gray");
        chip_lbl.set_halign(gtk::Align::Start);
        left.append(&chip_lbl);
        left.set_hexpand(true);
        top.append(&left);

        top.append(&stat_row("RPM", &stat_label(&format!("{}", fan.rpm), "stat-blue")));
        top.append(&stat_row("PWM", &stat_label(&format!("{}%", fan.pct), "stat-gray")));
        row.append(&top);

        if let Some(pwm_enable_path) = fan.pwm_enable_path.clone() {
            let controls = gtk::Box::new(gtk::Orientation::Horizontal, 12);

            let slider = gtk::Scale::with_range(gtk::Orientation::Horizontal, 0.0, 100.0, 1.0);
            slider.set_value(fan.pct as f64);
            slider.set_hexpand(true);
            slider.set_draw_value(true);

            let pwm_path = fan.pwm_path.clone();
            let pwm_enable_path_for_slider = pwm_enable_path.clone();
            slider.connect_value_changed(move |s| {
                let speed = s.value().round() as i32;
                let _ = hwmon::set_fan_speed(&pwm_path, Some(&pwm_enable_path_for_slider), speed);
            });
            controls.append(&slider);

            let auto_btn = gtk::Button::with_label("Auto");
            auto_btn.add_css_class("run-btn");
            let pwm_enable_path_for_auto = pwm_enable_path.clone();
            auto_btn.connect_clicked(move |_| {
                let _ = hwmon::set_fan_auto(&pwm_enable_path_for_auto);
            });
            controls.append(&auto_btn);

            row.append(&controls);
        } else {
            let note = gtk::Label::new(Some("Somente leitura (sem controle PWM neste sensor)."));
            note.add_css_class("stat-gray");
            note.set_halign(gtk::Align::Start);
            row.append(&note);
        }

        container.append(&row);
    }

    let hint = gtk::Label::new(Some("Controle de fans requer privilégios de root (escrita em /sys). Rode o app com sudo/pkexec se os sliders não tiverem efeito."));
    hint.add_css_class("stat-gray");
    hint.set_wrap(true);
    hint.set_margin_top(8);
    container.append(&hint);
}

// --- página: Memória ---

fn build_memory_page() -> gtk::Box {
    let page = gtk::Box::new(gtk::Orientation::Vertical, 16);
    page.set_margin_end(28);

    let mem = procstat::read_meminfo();
    let header = gtk::Box::new(gtk::Orientation::Horizontal, 24);
    header.add_css_class("card");
    header.append(&stat_row("Uso", &stat_label(&format!("{:.0}%", mem.usage_pct), "stat-blue")));
    header.append(&stat_row("Usado", &stat_label(&format!("{:.1} GB", mem.used_gb), "stat-gray")));
    header.append(&stat_row("Total", &stat_label(&format!("{:.1} GB", mem.total_gb), "stat-gray")));
    page.append(&header);

    let label = gtk::Label::new(Some("PENTES INSTALADOS"));
    label.add_css_class("section-label");
    label.set_halign(gtk::Align::Start);
    label.set_margin_top(8);
    page.append(&label);

    let flow = gtk::FlowBox::new();
    flow.set_selection_mode(gtk::SelectionMode::None);
    flow.set_max_children_per_line(4);
    flow.set_row_spacing(12);
    flow.set_column_spacing(12);

    let slots = memory::get_memory_slots(mem.total_gb);
    if slots.slots.is_empty() {
        let l = gtk::Label::new(Some("Não foi possível ler os slots de RAM (requer dmidecode, geralmente como root)."));
        page.append(&l);
    } else {
        for s in &slots.slots {
            let cell = gtk::Box::new(gtk::Orientation::Vertical, 4);
            cell.add_css_class("card");
            cell.set_size_request(200, -1);
            let top = gtk::Box::new(gtk::Orientation::Horizontal, 0);
            let loc = gtk::Label::new(Some(&s.locator));
            loc.add_css_class("card-title");
            loc.set_halign(gtk::Align::Start);
            loc.set_hexpand(true);
            top.append(&loc);
            top.append(&stat_label(&format!("{:.0} GB {}", s.size_gb, s.mem_type), "stat-blue"));
            cell.append(&top);
            cell.append(&stat_row("Fabricante", &stat_label(&s.manufacturer, "stat-gray")));
            cell.append(&stat_row("Velocidade", &stat_label(&format!("{} MT/s", s.speed_mhz), "stat-gray")));
            cell.append(&stat_row("Voltagem", &stat_label(&format!("{:.2} V", s.voltage), "stat-orange")));
            flow.insert(&cell, -1);
        }
    }
    page.append(&flow);
    page
}

// --- página: Energia (perfis) ---

fn build_energy_page() -> gtk::Box {
    let page = gtk::Box::new(gtk::Orientation::Vertical, 16);
    page.set_margin_end(28);

    let info = profiles::get_profiles_info();
    let row = gtk::Box::new(gtk::Orientation::Horizontal, 16);
    row.set_homogeneous(true);

    let defs = [
        ("silent", "Economia", "Baixo consumo · Silencioso"),
        ("balanced", "Equilibrado", "Desempenho adaptativo"),
        ("performance", "Desempenho", "Máximo desempenho"),
    ];

    for (id, title, desc) in defs {
        if !info.available_profiles.iter().any(|p| p == id) {
            continue;
        }
        let active = info.current_profile == id;
        let cell = gtk::Box::new(gtk::Orientation::Vertical, 8);
        cell.add_css_class("profile-card");
        if active {
            cell.add_css_class("active");
        }
        let t = gtk::Label::new(Some(title));
        t.add_css_class("card-title");
        cell.append(&t);
        let d = gtk::Label::new(Some(desc));
        d.add_css_class("stat-gray");
        cell.append(&d);
        if active {
            let badge = gtk::Label::new(Some("ATIVO"));
            badge.add_css_class("badge");
            badge.add_css_class("badge-orange");
            badge.set_halign(gtk::Align::Start);
            cell.append(&badge);
        }
        let btn = gtk::Button::with_label("Aplicar");
        btn.add_css_class(if active { "run-btn-primary" } else { "run-btn" });
        let cpu_count = procstat::cpu_core_count();
        let governors = info.available_governors.clone();
        let id_owned = id.to_string();
        btn.connect_clicked(move |_| {
            let _ = profiles::apply_profile(&id_owned, &governors, cpu_count);
        });
        cell.append(&btn);
        row.append(&cell);
    }
    page.append(&row);

    let note = gtk::Label::new(Some("Aplicar perfil requer privilégios de root (escrita em /sys). Rode o app com sudo/pkexec se necessário."));
    note.add_css_class("stat-gray");
    note.set_wrap(true);
    page.append(&note);

    page
}

// --- página: Limpeza ---

fn build_cleaner_page() -> gtk::Box {
    let page = gtk::Box::new(gtk::Orientation::Vertical, 12);
    page.set_margin_end(28);

    for task in cleaner::get_available_clean_tasks() {
        let row = gtk::Box::new(gtk::Orientation::Horizontal, 12);
        row.add_css_class("card");

        let left = gtk::Box::new(gtk::Orientation::Vertical, 2);
        let title_row = gtk::Box::new(gtk::Orientation::Horizontal, 8);
        let t = gtk::Label::new(Some(&task.label));
        t.add_css_class("card-title");
        title_row.append(&t);
        if task.needs_root {
            let badge = gtk::Label::new(Some("ROOT"));
            badge.add_css_class("badge");
            badge.add_css_class("badge-orange");
            title_row.append(&badge);
        }
        left.append(&title_row);
        let desc = gtk::Label::new(Some(&task.description));
        desc.add_css_class("stat-gray");
        desc.set_halign(gtk::Align::Start);
        left.append(&desc);
        left.set_hexpand(true);
        row.append(&left);

        let btn = gtk::Button::with_label("Executar");
        btn.add_css_class("run-btn");
        let result_lbl = gtk::Label::new(None);
        result_lbl.add_css_class("stat-green");

        let task_id = task.id.clone();
        let result_lbl_clone = result_lbl.clone();
        btn.connect_clicked(move |_| {
            let r = cleaner::run_clean_task(&task_id);
            result_lbl_clone.set_text(&format!("{} ({})", r.result, r.cleaned.unwrap_or_default()));
        });

        row.append(&btn);
        page.append(&row);
        page.append(&result_lbl);
    }
    page
}

// --- páginas simples (placeholders, prontas pra evoluir) ---

fn build_placeholder_page(title: &str, msg: &str) -> gtk::Box {
    let page = gtk::Box::new(gtk::Orientation::Vertical, 8);
    page.set_valign(gtk::Align::Center);
    page.set_halign(gtk::Align::Center);
    page.set_vexpand(true);
    let t = gtk::Label::new(Some(title));
    t.add_css_class("card-title");
    page.append(&t);
    let m = gtk::Label::new(Some(msg));
    m.add_css_class("stat-gray");
    page.append(&m);
    page
}

// --- sidebar ---

struct NavItem {
    id: &'static str,
    label: &'static str,
    icon: &'static str,
}

const NAV_ITEMS: &[NavItem] = &[
    NavItem { id: "overview", label: "Visão Geral", icon: "assets/icons/overview.svg" },
    NavItem { id: "cpu", label: "CPU", icon: "assets/icons/cpu.svg" },
    NavItem { id: "memory", label: "Memória", icon: "assets/icons/memory.svg" },
    NavItem { id: "disks", label: "Discos", icon: "assets/icons/disks.svg" },
    NavItem { id: "fans", label: "Fans", icon: "assets/icons/fans.svg" },
    NavItem { id: "energy", label: "Energia", icon: "assets/icons/energy.svg" },
    NavItem { id: "cleaner", label: "Limpeza", icon: "assets/icons/cleaner.svg" },
    NavItem { id: "benchmark", label: "Benchmark", icon: "assets/icons/benchmark.svg" },
    NavItem { id: "about", label: "Sobre", icon: "assets/icons/about.svg" },
];

fn build_sidebar(stack: &gtk::Stack) -> gtk::Box {
    let sidebar = gtk::Box::new(gtk::Orientation::Vertical, 2);
    sidebar.add_css_class("sidebar");
    sidebar.set_width_request(96);

    let buttons: Rc<RefCell<Vec<(String, gtk::Box)>>> = Rc::new(RefCell::new(Vec::new()));

    for item in NAV_ITEMS {
        let btn = gtk::Button::new();
        btn.add_css_class("sidebar-btn");
        btn.add_css_class("flat");

        let content = gtk::Box::new(gtk::Orientation::Vertical, 4);
        content.set_halign(gtk::Align::Center);
        let icon = gtk::Image::from_file(item.icon);
        icon.set_pixel_size(28);
        icon.set_halign(gtk::Align::Center);
        let lbl = gtk::Label::new(Some(item.label));
        lbl.set_halign(gtk::Align::Center);
        content.append(&icon);
        content.append(&lbl);
        btn.set_child(Some(&content));

        buttons.borrow_mut().push((item.id.to_string(), content));

        let stack_clone = stack.clone();
        let id = item.id.to_string();
        let buttons_clone = buttons.clone();
        btn.connect_clicked(move |_| {
            stack_clone.set_visible_child_name(&id);
            for (bid, bcontent) in buttons_clone.borrow().iter() {
                if bid == &id {
                    bcontent.add_css_class("selected");
                } else {
                    bcontent.remove_css_class("selected");
                }
            }
        });

        sidebar.append(&btn);
    }

    sidebar
}

fn main() -> glib::ExitCode {
    let app = adw::Application::builder().application_id("com.machctrl.app").build();

    app.connect_activate(|app| {
        adw::StyleManager::default().set_color_scheme(adw::ColorScheme::ForceLight);

        let display = gtk::gdk::Display::default().expect("sem display");

        // Garante os ícones de Adwaita como busca extra, independente do tema de ícones
        // ativo no sistema (GNOME/KDE/etc podem usar outro tema por padrão que não tenha
        // os nomes simbólicos que usamos na sidebar).
        let icon_theme = gtk::IconTheme::for_display(&display);
        for path in ["/usr/share/icons/Adwaita", "/usr/local/share/icons/Adwaita"] {
            if std::path::Path::new(path).exists() {
                icon_theme.add_search_path(path);
            }
        }

        let provider = gtk::CssProvider::new();
        provider.load_from_path("src/style.css");
        gtk::style_context_add_provider_for_display(
            &display,
            &provider,
            gtk::STYLE_PROVIDER_PRIORITY_APPLICATION,
        );

        let window = adw::ApplicationWindow::builder()
            .application(app)
            .title(APP_NAME)
            .default_width(1200)
            .default_height(760)
            .build();

        // --- header bar ---
        let header = adw::HeaderBar::new();
        let title_box = gtk::Box::new(gtk::Orientation::Horizontal, 8);
        let app_icon = gtk::Image::from_file("assets/app-icon.png");
        app_icon.set_pixel_size(22);
        title_box.append(&app_icon);
        let name_lbl = gtk::Label::new(Some(APP_NAME));
        name_lbl.add_css_class("title-2");
        title_box.append(&name_lbl);
        let version_badge = gtk::Label::new(Some(APP_VERSION));
        version_badge.add_css_class("badge");
        version_badge.add_css_class("badge-blue");
        title_box.append(&version_badge);
        header.set_title_widget(Some(&title_box));

        let status_lbl = gtk::Label::new(Some("● Pronto"));
        status_lbl.add_css_class("status-connected");
        header.pack_end(&status_lbl);

        // --- stack + páginas ---
        let stack = gtk::Stack::new();

        let (overview_page, overview_w) = build_overview_page();
        stack.add_named(&overview_page, Some("overview"));

        let (cpu_page, cpu_container) = build_cpu_page();
        stack.add_named(&cpu_page, Some("cpu"));

        stack.add_named(&build_memory_page(), Some("memory"));
        stack.add_named(&build_placeholder_page("Discos", "Detalhamento por partição — em construção."), Some("disks"));
        let (fans_page, fans_container) = build_fans_page();
        refresh_fans_page(&fans_container);
        stack.add_named(&fans_page, Some("fans"));
        stack.add_named(&build_energy_page(), Some("energy"));
        stack.add_named(&build_cleaner_page(), Some("cleaner"));
        stack.add_named(&build_placeholder_page("Benchmark", "Testes de CPU/Memória — em construção."), Some("benchmark"));
        stack.add_named(
            &build_placeholder_page(APP_NAME, "Reescrita em Rust puro + GTK4/libadwaita — sem Electron, sem WebView."),
            Some("about"),
        );

        stack.set_visible_child_name("overview");

        // --- layout geral ---
        let sidebar = build_sidebar(&stack);
        let body = gtk::Box::new(gtk::Orientation::Horizontal, 0);
        body.append(&sidebar);

        let content_col = gtk::Box::new(gtk::Orientation::Vertical, 0);
        content_col.append(&page_header("MachCtrl", &subtitle_box()));
        let scroller = gtk::ScrolledWindow::new();
        scroller.set_child(Some(&stack));
        scroller.set_vexpand(true);
        content_col.append(&scroller);
        content_col.set_hexpand(true);
        body.append(&content_col);

        let root = gtk::Box::new(gtk::Orientation::Vertical, 0);
        root.append(&header);
        root.append(&body);

        window.set_content(Some(&root));
        window.present();

        // --- loop de atualização (1s, igual ao resto do projeto) ---
        let state = Rc::new(RefCell::new(AppState::new()));
        let stack_for_loop = stack.clone();
        glib::source::timeout_add_seconds_local(1, move || {
            let mut st = state.borrow_mut();
            refresh_overview(&overview_w, &mut st);
            refresh_cpu_page(&cpu_container, &mut st);
            if stack_for_loop.visible_child_name().as_deref() == Some("fans") {
                refresh_fans_page(&fans_container);
            }
            glib::ControlFlow::Continue
        });
    });

    app.run()
}
