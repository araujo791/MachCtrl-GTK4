// i18n simples: o texto-fonte é o português; EN traduz por chave exata.
export type Lang = 'pt-BR' | 'en';

export const EN: Record<string, string> = {
  // navegação
  'Visão Geral': 'Overview', 'CPU': 'CPU', 'Memória': 'Memory', 'Discos': 'Disks', 'Fans': 'Fans',
  'Energia': 'Power', 'Limpeza': 'Cleanup', 'Ajuste': 'Tuning', 'Sobre': 'About',
  // header
  'Modo Escuro': 'Dark mode', 'Modo Claro': 'Light mode',
  'Conectado': 'Connected', 'Lendo sensores…': 'Reading sensors…', 'Atualizar dados': 'Refresh data',
  'Alternar idioma': 'Switch language', 'Minimizar': 'Minimize', 'Maximizar': 'Maximize', 'Fechar': 'Close',
  'Uptime': 'Uptime',
  // alerta
  'Temperatura alta!': 'High temperature!', 'CPU em': 'CPU at', 'GPU em': 'GPU at',
  // overview
  'Meu Dashboard': 'My Dashboard', 'CPU Global': 'Global CPU', 'Memória RAM': 'RAM', 'Temperatura': 'Temperature',
  'Normal': 'Normal', 'Morno': 'Warm', 'Quente': 'Hot', 'Fans PWM': 'Fans PWM', 'Uso da CPU': 'CPU usage',
  'Processadores': 'Processors', 'Núcleos': 'Cores', 'Threads': 'Threads', 'Frequência': 'Frequency', 'Uso': 'Usage', 'Livre': 'Free', 'Usado': 'Used',
  'Total': 'Total', 'em uso': 'in use', 'livre': 'free', 'usado': 'used', 'Bateria': 'Battery', 'Carregando': 'Charging', 'Descarregando': 'Discharging',
  'Carga completa': 'Fully charged', 'Na tomada': 'Plugged in', 'Saúde': 'Health', 'Tensão': 'Voltage',
  'Top processos (RAM)': 'Top processes (RAM)', 'Rede': 'Network', 'Download': 'Download', 'Upload': 'Upload',
  'Nenhuma interface de rede ativa': 'No active network interface', 'Lendo…': 'Reading…',
  'Pico': 'Peak', 'Placa de vídeo': 'Graphics', 'Frequência da GPU': 'GPU frequency', 'VRAM': 'VRAM',
  'Ventoinha': 'Fan', 'Sistema': 'System', 'Armazenamento': 'Storage', 'Placa-mãe': 'Motherboard',
  // cpu
  'Monitoramento de CPU Avançado': 'Advanced CPU Monitoring',
  'Acompanhamento individual de atividade, temperatura e frequência de cada thread e núcleo físico':
    'Per-core activity, temperature and frequency tracking',
  'núcleos': 'cores', 'threads': 'threads', 'USO MÉDIO': 'AVG USAGE', 'TEMPERATURA': 'TEMPERATURE', 'FREQ': 'FREQ',
  'Atividade (%)': 'Activity (%)', 'Temperatura (°C)': 'Temperature (°C)', 'Aguardando leitura…': 'Waiting for data…',
  // memória
  'Gestão de Memória RAM': 'RAM Management',
  'Visualização dos pentes instalados via dmidecode, velocidade MT/s, voltagem e slots disponíveis':
    'Installed modules via dmidecode, speed (MT/s), voltage and available slots',
  'Slots': 'Slots', 'PENTES INSTALADOS': 'INSTALLED MODULES', 'Slot vazio': 'Empty slot', 'Fabricante': 'Manufacturer',
  'Modelo': 'Model', 'Velocidade': 'Speed', 'Voltagem': 'Voltage', 'Ler com privilégios': 'Read with privileges',
  'Nenhum pente detectado (requer dmidecode/root)': 'No modules detected (requires dmidecode/root)',
  // discos
  'Armazenamento & Discos': 'Storage & Disks',
  'Taxa de leitura e escrita em tempo real, capacidade total e sistemas de arquivos (F2FS, BTRFS, EXT4, etc.)':
    'Real-time read/write rate, capacity and filesystems (F2FS, BTRFS, EXT4, etc.)',
  'Leitura': 'Read', 'Escrita': 'Write',
  // fans
  'Controle de Ventoinhas (Fans)': 'Fan Control',
  'Controle de rotação por hardware e curvas térmicas com animação fluida': 'Hardware fan control and thermal curves',
  'Editor de Curvas Térmicas': 'Thermal Curve Editor', 'modo:': 'mode:', 'PWM atual': 'Current PWM',
  'Automático': 'Automatic', 'Manual': 'Manual', 'Máximo': 'Maximum', 'Curva': 'Curve',
  'Curva ativa — clique para editar': 'Active curve — click to edit', 'Editar curva': 'Edit curve',
  'Nenhuma ventoinha detectada': 'No fans detected', 'somente leitura': 'read-only',
  'Ventoinha no máximo?': 'Fan at maximum?',
  'A ventoinha vai girar a 100% e pode ficar bem barulhenta. Deseja continuar?':
    'The fan will spin at 100% and may get very loud. Continue?',
  'Continuar': 'Continue', 'Cancelar': 'Cancel',
  'Editor de Curva Térmica (PWM vs Temp °C)': 'Thermal Curve Editor (PWM vs Temp °C)',
  'Ajuste os nós de disparo térmico para as ventoinhas': 'Adjust the thermal trigger nodes for the fans',
  'Aplicar e Fechar': 'Apply & Close', 'Ponto': 'Point',
  // energia
  'Perfis de Energia & Bateria': 'Power Profiles & Battery',
  'Ajuste simplificado para os modos de Desempenho, Equilibrado e Economia de Bateria com detalhamento de saúde':
    'Simple Performance, Balanced and Battery-saver modes with health details',
  'Saúde da bateria': 'Battery health',
  'Capacidade atual de carga comparada à de fábrica. Abaixo de 60% a bateria já dura bem menos.':
    'Current charge capacity compared to factory. Below 60% the battery lasts much less.',
  'Capacidade': 'Capacity', 'Tecnologia': 'Technology', 'Fonte': 'Source', 'NA TOMADA': 'PLUGGED IN', 'BATERIA': 'BATTERY',
  'Ciclos': 'Cycles', 'Consumo': 'Power draw', 'Restante': 'Remaining',
  'Economia': 'Power saver', 'Equilibrado': 'Balanced', 'Desempenho': 'Performance',
  'Baixo consumo · Silencioso': 'Low power · Quiet', 'Desempenho adaptativo': 'Adaptive performance',
  'Máximo desempenho · Turbo': 'Max performance · Turbo', 'ATIVO': 'ACTIVE', 'Ativo': 'Active', 'Aplicar': 'Apply',
  'Aplicar perfil requer privilégios (escrita em /sys).': 'Applying a profile requires privileges (writes to /sys).',
  'Sem bateria detectada': 'No battery detected',
  // limpeza
  'Limpeza & Manutenção do Sistema': 'System Cleanup & Maintenance',
  'Manutenção ágil para remover pacotes órfãos, esvaziar cache do Pacman, limpar logs do Journal e lixeira':
    'Quick maintenance: remove orphan packages, empty the Pacman cache, clean Journal logs and trash',
  'Limpeza do Sistema': 'System Cleanup', 'tarefas disponíveis · remove caches, logs e temporários':
    'tasks available · removes caches, logs and temp files',
  'Limpar tudo': 'Clean all', 'Limpando sistema...': 'Cleaning…', 'TOTAL LIBERADO': 'TOTAL FREED',
  'Executar': 'Run', 'Executando…': 'Running…', 'Limpo': 'Done', 'Falhou': 'Failed',
  // ajuste
  'Ajustes do Sistema (Kernel Tuning)': 'System Tuning (Kernel)',
  'Otimizações de baixo nível para memória, rede, dirty pages e agendadores de E/S no Linux CachyOS':
    'Low-level tuning for memory, network, dirty pages and I/O schedulers',
  'MEMÓRIA & SWAP': 'MEMORY & SWAP', 'Pressão de cache (vfs)': 'Cache pressure (vfs)', 'Huge Pages': 'Huge Pages',
  'REDE & TCP': 'NETWORK & TCP', 'Controle de congestionamento TCP': 'TCP congestion control',
  'ESCRITA EM DISCO (DIRTY PAGES)': 'DISK WRITEBACK (DIRTY PAGES)', 'Início da gravação (bg)': 'Writeback start (bg)',
  'Limite de gravação': 'Writeback limit', 'SERVIÇOS SYSTEMD': 'SYSTEMD SERVICES',
  'Liga/desliga daemons do sistema em tempo real e na inicialização.': 'Turn system daemons on/off now and at boot.',
  'AGENDADOR DE I/O': 'I/O SCHEDULER',
  "Como o kernel ordena E/S. 'none' é ideal para NVMe; 'bfq' para HDD.": "How the kernel orders I/O. 'none' suits NVMe; 'bfq' suits HDD.",
  'Swappiness': 'Swappiness',
  'Quanto o kernel prefere usar swap em vez de liberar cache.': 'How much the kernel prefers swap over dropping cache.',
  'Quão rápido o kernel recupera cache de diretórios/inodes.': 'How quickly the kernel reclaims dentry/inode cache.',
  'Usa páginas grandes de memória: bom para jogos/bancos de dados.': 'Uses large memory pages: good for games/databases.',
  'Algoritmo que decide como a conexão reage a congestionamento.': 'Algorithm that decides how connections react to congestion.',
  '% de memória suja que dispara a gravação em segundo plano.': '% of dirty memory that triggers background writeback.',
  '% de memória suja em que programas passam a esperar a gravação.': '% of dirty memory at which programs block on writeback.',
  'Não disponível neste sistema': 'Not available on this system',
  // sobre
  'Covenant · CachyOS Linux': 'Covenant · CachyOS Linux',
  'Monitor e Otimizador de Hardware nativo para Linux. Projetado com telemetria direta via sysfs/procfs, curvas de ventoinhas e sintonia fina de desempenho.':
    'Native hardware monitor and optimizer for Linux. Built on direct sysfs/procfs telemetry, fan curves and performance tuning.',
  'Apoiar o MachCtrl': 'Support MachCtrl',
  'Se o MachCtrl te ajuda a extrair o máximo do seu sistema e você deseja incentivar novas melhorias contínuas, faça uma doação via PayPal.':
    'If MachCtrl helps you get the most out of your system and you want to encourage further improvements, consider donating via PayPal.',
  'Fazer Doação pelo PayPal': 'Donate with PayPal',
  'Agradecemos imensamente o seu apoio à comunidade Open Source!': 'Thank you very much for supporting the Open Source community!',
  'Instalado em': 'Installed on', 'Kernel': 'Kernel',
};

export function makeT(lang: Lang) {
  return (s: string): string => (lang === 'en' ? EN[s] ?? s : s);
}

export function detectLang(): Lang {
  const langs = [...(navigator.languages || []), navigator.language || ''].map((l) => l.toLowerCase());
  return langs.some((l) => l.startsWith('pt')) ? 'pt-BR' : 'en';
}
