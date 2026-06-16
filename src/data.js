// ── Roles image reference ──────────────────────────────
// Relative path to the role reference image next to index.html.
// Leave empty ('') to hide the button.
export const ROLES_IMG_URL = 'assets/roles_en.png';

// ── Trouble Brewing role data ──────────────────────────
export const ROLES = [
  { name:'Washerwoman',   cat:'townsfolk', align:'good', ability:'You start knowing that 1 of 2 players is a particular Townsfolk.' },
  { name:'Librarian',     cat:'townsfolk', align:'good', ability:'You start knowing that 1 of 2 players is a particular Outsider. (Or that 0 are in play.)' },
  { name:'Investigator',  cat:'townsfolk', align:'good', ability:'You start knowing that 1 of 2 players is a particular Minion.' },
  { name:'Chef',          cat:'townsfolk', align:'good', ability:'You start knowing how many pairs of evil players there are.' },
  { name:'Empath',        cat:'townsfolk', align:'good', ability:'Each night, you learn how many of your 2 alive neighbours are evil.' },
  { name:'Fortune Teller',cat:'townsfolk', align:'good', ability:'Each night, choose 2 players: you learn if either is the Demon. There is a good player that registers as the Demon to you.' },
  { name:'Undertaker',    cat:'townsfolk', align:'good', ability:'Each night*, you learn which character died by execution today.' },
  { name:'Monk',          cat:'townsfolk', align:'good', ability:'Each night*, choose a player (not yourself): they are safe from the Demon tonight.' },
  { name:'Ravenkeeper',   cat:'townsfolk', align:'good', ability:'If you die at night, you are woken to choose a player: you learn their character.' },
  { name:'Virgin',        cat:'townsfolk', align:'good', ability:'The 1st time you are nominated, if the nominator is a Townsfolk, they are immediately executed.' },
  { name:'Slayer',        cat:'townsfolk', align:'good', ability:'Once per game, during the day, publicly choose a player: if they are the Demon, they die.' },
  { name:'Soldier',       cat:'townsfolk', align:'good', ability:'You are safe from the Demon.' },
  { name:'Mayor',         cat:'townsfolk', align:'good', ability:'If only 3 players live & no execution occurs, your team wins. If you die at night, another player might die instead.' },
  { name:'Butler',        cat:'outsider',  align:'good', ability:'Each night, choose a player (not yourself): tomorrow, you may only vote if they are voting too.' },
  { name:'Recluse',        cat:'outsider',  align:'good', ability:'You might register as evil & as a Minion or Demon, even if dead.' },
  { name:'Drunk',          cat:'outsider',  align:'good', ability:'You do not know you are the Drunk. You think you are a Townsfolk character, but your ability malfunctions.' },
  { name:'Saint',         cat:'outsider',  align:'good', ability:'If you die by execution, your team loses.' },
  { name:'Poisoner',      cat:'minion',    align:'evil', ability:'Each night, choose a player: they are poisoned tonight and tomorrow day. Their ability malfunctions.' },
  { name:'Baron',         cat:'minion',    align:'evil', ability:'There are extra 2 Outsiders in play. [+2 Outsiders]' },
  { name:'Spy',           cat:'minion',    align:'evil', ability:'Each night, you see the Grimoire. You might register as good & as a Townsfolk or Outsider, even if dead.' },
  { name:'Scarlet Woman', cat:'minion',    align:'evil', ability:'If there are 5 or more players alive & the Demon dies, you become the Demon. (Travellers don\'t count.)' },
  { name:'Imp',           cat:'demon',     align:'evil', ability:'Each night*, choose a player: they die. If you kill yourself this way, a Minion becomes the Imp.' },
  { name:'Apprentice',    cat:'traveler',  align:'good', ability:'On your 1st night, you gain a Townsfolk or Minion ability.' },
  { name:'Barista',       cat:'traveler',  align:'good', ability:'Each night, choose a player (not yourself): either their ability works twice tonight, or they are sober/healthy/etc.' },
  { name:'Beggar',        cat:'traveler',  align:'good', ability:'You must use a vote token to vote. Dead players may give you their vote token. If you lose yours, you lose your ability.' },
  { name:'Bone Collector',cat:'traveler',  align:'good', ability:'Once per game, at night, choose a dead player: they regain their ability until dusk.' },
  { name:'Bureaucrat',    cat:'traveler',  align:'good', ability:'Each night, choose a player (not yourself): they have 3 votes on every nomination tomorrow and their vote can\'t be changed.' },
  { name:'Butcher',       cat:'traveler',  align:'good', ability:'Each day, you may nominate an extra player.' },
  { name:'Deviant',       cat:'traveler',  align:'good', ability:'If you were funny today, 1 player cannot vote tomorrow.' },
  { name:'Gangster',      cat:'traveler',  align:'good', ability:'Once per game, during the day, you may choose to kill an alive neighbor: if they are the same alignment as you, you die instead.' },
  { name:'Gunslinger',    cat:'traveler',  align:'good', ability:'Each day, after the first vote has been tallied, you may shoot 1 player that voted: they die.' },
  { name:'Harlot',        cat:'traveler',  align:'good', ability:'Each night*, choose a living player: if they agree, you learn their character, but you both might die.' },
  { name:'Judge',         cat:'traveler',  align:'good', ability:'Once per game, if another player nominated, you may choose to force either a successful or failed execution.' },
  { name:'Matron',        cat:'traveler',  align:'good', ability:'Each day, choose up to 3 players to swap seats. Players may not leave their seats to talk privately.' },
  { name:'Scapegoat',     cat:'traveler',  align:'good', ability:'If a player of your alignment is executed, you might be executed instead.' },
  { name:'Thief',         cat:'traveler',  align:'good', ability:'Each night, choose a player: their vote counts as −1 vote tomorrow.' },
];

// ── Role icons ─────────────────────────────────────────
export const ROLE_ICONS = {
  'Washerwoman':    'assets/roles/Icon_washerwoman.png',
  'Librarian':      'assets/roles/Icon_librarian.png',
  'Investigator':   'assets/roles/Icon_investigator.png',
  'Chef':           'assets/roles/Icon_chef.png',
  'Empath':         'assets/roles/Icon_empath.png',
  'Fortune Teller': 'assets/roles/Icon_fortuneteller.png',
  'Undertaker':     'assets/roles/Icon_undertaker.png',
  'Monk':           'assets/roles/Icon_monk.png',
  'Ravenkeeper':    'assets/roles/Icon_ravenkeeper.png',
  'Virgin':         'assets/roles/Icon_virgin.png',
  'Slayer':         'assets/roles/Icon_slayer.png',
  'Soldier':        'assets/roles/Icon_soldier.png',
  'Mayor':          'assets/roles/Icon_mayor.png',
  'Butler':         'assets/roles/Icon_butler.png',
  'Drunk':          'assets/roles/Icon_drunk.png',
  'Recluse':        'assets/roles/Icon_recluse.png',
  'Saint':          'assets/roles/Icon_saint.png',
  'Poisoner':       'assets/roles/Icon_poisoner.png',
  'Spy':            'assets/roles/Icon_spy.png',
  'Scarlet Woman':  'assets/roles/Icon_scarletwoman.png',
  'Baron':          'assets/roles/Icon_baron.png',
  'Imp':            'assets/roles/Icon_imp.png',
  'Apprentice':     'assets/roles/Icon_apprentice.png',
  'Barista':        'assets/roles/Icon_barista.png',
  'Beggar':         'assets/roles/Icon_beggar.png',
  'Bone Collector': 'assets/roles/Icon_bonecollector.png',
  'Bureaucrat':     'assets/roles/Icon_bureaucrat.png',
  'Butcher':        'assets/roles/Icon_butcher.png',
  'Deviant':        'assets/roles/Icon_deviant.png',
  'Gangster':       'assets/roles/Icon_gangster.png',
  'Gunslinger':     'assets/roles/Icon_gunslinger.png',
  'Harlot':         'assets/roles/Icon_harlot.png',
  'Judge':          'assets/roles/Icon_judge.png',
  'Matron':         'assets/roles/Icon_matron.png',
  'Scapegoat':      'assets/roles/Icon_scapegoat.png',
  'Thief':          'assets/roles/Icon_thief.png',
};

// ── Night order (Trouble Brewing) ─────────────────────
// st:true  = Storyteller-only step (no player wakes)
// cond:true = conditional (only wakes if triggered)
export const NIGHT_ORDER = {
  first: [
    { name: 'Minion info',    st: true,   hint: 'Minions learn each other & the Demon' },
    { name: 'Demon info',     st: true,   hint: 'Demon learns Minions & 3 not-in-play good roles' },
    { name: 'Poisoner',       hint: 'Chooses a player to poison tonight' },
    { name: 'Spy',            hint: 'Sees the Grimoire' },
    { name: 'Washerwoman',    hint: 'Learns that one of two players is a Townsfolk' },
    { name: 'Librarian',      hint: 'Learns that one of two players is an Outsider (or that there are none)' },
    { name: 'Investigator',   hint: 'Learns that one of two players is a Minion' },
    { name: 'Chef',           hint: 'Learns how many pairs of evil players sit adjacent' },
    { name: 'Empath',         hint: 'Learns how many of their living neighbours are evil' },
    { name: 'Fortune Teller', hint: 'Picks two players; learns if either is the Demon (or a red herring)' },
    { name: 'Butler',         hint: 'Chooses their master for tonight' },
  ],
  other: [
    { name: 'Poisoner',       hint: 'Chooses a player to poison tonight' },
    { name: 'Monk',           hint: 'Chooses a player to protect from the Demon' },
    { name: 'Scarlet Woman',  hint: 'Becomes the Demon if the Demon dies with ≥5 players alive', cond: true },
    { name: 'Imp',            hint: 'Chooses a player to kill (can choose self to pass the Imp)' },
    { name: 'Ravenkeeper',    hint: 'Wakes if killed tonight — learns the role of a player', cond: true },
    { name: 'Undertaker',     hint: 'Learns the role of the player executed yesterday', cond: true },
    { name: 'Empath',         hint: 'Learns how many of their living neighbours are evil' },
    { name: 'Fortune Teller', hint: 'Picks two players; learns if either is the Demon (or a red herring)' },
    { name: 'Butler',         hint: 'Chooses their master for tonight' },
    { name: 'Spy',            hint: 'Sees the Grimoire' },
  ],
};

export const CAT_LABELS = {
  townsfolk: 'Townsfolk',
  outsider:  'Outsiders',
  minion:    'Minions',
  demon:     'Demon',
  traveler:  'Travelers',
};
export const CAT_ORDER = ['townsfolk','outsider','minion','demon','traveler'];

// ── Auto Bulgarian names ───────────────────────────────
export const BG_NAMES = [
  'Александър','Ангела','Андрей','Антония','Бойко',
  'Борислав','Валентина','Васил','Георги','Даниела',
  'Денис','Димитър','Елена','Иван','Иванка',
  'Илиян','Илияна','Ирина','Калина','Красимир',
  'Кристина','Любомир','Мария','Мартин','Милена',
  'Михаил','Надя','Николай','Павел','Петър',
  'Пламена','Радослав','Росица','Симеон','Снежана',
  'Станислав','Стефан','Стефка','Тодор','Теодора',
  'Цветан','Цветелина','Христо','Христина','Ивайло',
  'Йордан','Златка','Веселин','Драгомир','Асен',
  'Галина','Деляна','Николета','Пламен','Радостина',
  'Герасим', 'Велизар', 'Генади', 'Генка', 'Генчо', 'Гергана',
];
