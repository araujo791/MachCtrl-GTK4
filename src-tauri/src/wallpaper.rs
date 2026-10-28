//! Lê o wallpaper do desktop do usuário (KDE Plasma) e devolve uma versão
//! miniaturizada e muito desfocada, como data URL JPEG. O frontend usa isso
//! de fundo: o CSS não consegue desfocar o que está atrás da janela, então o
//! desfoque é feito aqui, uma única vez.

use std::path::{Path, PathBuf};

const IMG_EXT: [&str; 5] = ["jpg", "jpeg", "png", "webp", "jxl"];

fn user_home() -> Option<PathBuf> {
    std::env::var("SUDO_USER")
        .ok()
        .and_then(|user| {
            std::process::Command::new("getent")
                .args(["passwd", &user])
                .output()
                .ok()
                .and_then(|o| String::from_utf8_lossy(&o.stdout).split(':').nth(5).map(|h| h.to_string()))
        })
        .or_else(|| std::env::var("HOME").ok())
        .map(PathBuf::from)
}

fn percent_decode(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Ok(v) = u8::from_str_radix(&s[i + 1..i + 3], 16) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn is_image(p: &Path) -> bool {
    p.extension()
        .and_then(|e| e.to_str())
        .map(|e| IMG_EXT.contains(&e.to_lowercase().as_str()))
        .unwrap_or(false)
}

/// Dado um caminho (arquivo ou pasta de wallpaper do Plasma), acha a imagem.
fn resolve_image(p: &Path) -> Option<PathBuf> {
    if p.is_file() {
        return is_image(p).then(|| p.to_path_buf());
    }
    if p.is_dir() {
        // pacote do Plasma: <pasta>/contents/images/<WxH>.jpg — pega o maior arquivo
        for sub in [p.join("contents/images"), p.to_path_buf()] {
            if let Ok(rd) = std::fs::read_dir(&sub) {
                let best = rd
                    .flatten()
                    .map(|e| e.path())
                    .filter(|f| f.is_file() && is_image(f))
                    .max_by_key(|f| std::fs::metadata(f).map(|m| m.len()).unwrap_or(0));
                if best.is_some() {
                    return best;
                }
            }
        }
    }
    None
}

fn plasma_wallpaper(home: &Path) -> Option<PathBuf> {
    let rc = std::fs::read_to_string(home.join(".config/plasma-org.kde.plasma.desktop-appletsrc")).ok()?;
    for line in rc.lines() {
        let line = line.trim();
        if let Some(v) = line.strip_prefix("Image=") {
            let v = v.trim();
            let path = percent_decode(v.strip_prefix("file://").unwrap_or(v));
            if let Some(img) = resolve_image(Path::new(&path)) {
                return Some(img);
            }
        }
    }
    None
}

fn base64(data: &[u8]) -> String {
    const T: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(data.len() * 4 / 3 + 4);
    for c in data.chunks(3) {
        let n = (c[0] as u32) << 16 | (*c.get(1).unwrap_or(&0) as u32) << 8 | *c.get(2).unwrap_or(&0) as u32;
        out.push(T[(n >> 18) as usize & 63] as char);
        out.push(T[(n >> 12) as usize & 63] as char);
        out.push(if c.len() > 1 { T[(n >> 6) as usize & 63] as char } else { '=' });
        out.push(if c.len() > 2 { T[n as usize & 63] as char } else { '=' });
    }
    out
}

/// Retorna `data:image/jpeg;base64,...` do wallpaper, miniaturizado e desfocado.
pub fn blurred_wallpaper() -> Option<String> {
    blurred_from(&user_home()?)
}

fn cache_file() -> PathBuf {
    // root (sudo) grava aqui; independe do HOME e não suja a pasta do usuário
    PathBuf::from("/var/tmp/machctrl-wallpaper.cache")
}

/// Chave que muda quando o arquivo do wallpaper muda (caminho + tamanho + mtime).
fn cache_key(path: &Path) -> String {
    let m = std::fs::metadata(path).ok();
    let len = m.as_ref().map(|m| m.len()).unwrap_or(0);
    let mt = m
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!("{}|{}|{}", path.display(), len, mt)
}

fn blurred_from(home: &Path) -> Option<String> {
    let path = plasma_wallpaper(home)?;
    let key = cache_key(&path);
    if let Ok(c) = std::fs::read_to_string(cache_file()) {
        if let Some((k, url)) = c.split_once('\n') {
            if k == key && url.starts_with("data:image/") {
                return Some(url.to_string());
            }
        }
    }
    let url = render_blur(&path)?;
    let _ = std::fs::write(cache_file(), format!("{}\n{}", key, url));
    Some(url)
}

fn render_blur(path: &Path) -> Option<String> {
    let img = image::open(path).ok()?;
    // 480px de largura já basta: será esticado pelo CSS e o desfoque esconde a perda
    let small = img.thumbnail(480, 270);
    let blurred = image::imageops::blur(&small.to_rgb8(), 5.0);
    let mut buf = Vec::new();
    let enc = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buf, 78);
    image::DynamicImage::ImageRgb8(blurred).write_with_encoder(enc).ok()?;
    Some(format!("data:image/jpeg;base64,{}", base64(&buf)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decode_percent() {
        assert_eq!(percent_decode("/home/a%20b/x.jpg"), "/home/a b/x.jpg");
        assert_eq!(percent_decode("abc%"), "abc%");
    }

    #[test]
    fn wallpaper_from_plasma_rc() {
        let home = std::env::temp_dir().join(format!("mc_wp_{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&home);
        std::fs::create_dir_all(home.join(".config")).unwrap();
        let dir = home.join("Pictures/Meu Papel");
        std::fs::create_dir_all(&dir).unwrap();
        let img = image::RgbImage::from_fn(64, 36, |x, y| image::Rgb([(x * 4) as u8, (y * 7) as u8, 120]));
        img.save(dir.join("bg.png")).unwrap();
        let rc = format!(
            "[Containments][1][Wallpaper][org.kde.image][General]\nImage=file://{}/Pictures/Meu%20Papel/bg.png\n",
            home.display()
        );
        std::fs::write(home.join(".config/plasma-org.kde.plasma.desktop-appletsrc"), rc).unwrap();
        let url = blurred_from(&home).expect("deveria achar o wallpaper");
        assert!(url.starts_with("data:image/jpeg;base64,/9j/"));
        assert!(blurred_from(&home.join("nao-existe")).is_none());
        let _ = std::fs::remove_dir_all(&home);
    }

    #[test]
    fn b64() {
        assert_eq!(base64(b"Man"), "TWFu");
        assert_eq!(base64(b"Ma"), "TWE=");
        assert_eq!(base64(b"M"), "TQ==");
    }
}
