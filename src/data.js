// ── Roles image reference ──────────────────────────────
// Relative path to the role reference image next to index.html.
// Leave empty ('') to hide the button.
export const ROLES_IMG_URL = 'assets/roles_en.png';

export const SCRIPT_OPTIONS = [
  { id: 'tb', label: 'Trouble Brewing' },
  { id: 'bmr', label: 'Bad Moon Rising' },
  { id: 'snv', label: 'Sects and Violets' },
];

export function normalizeScript(script) {
  return SCRIPT_OPTIONS.some(s => s.id === script) ? script : 'tb';
}

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

const TRAVELER_ROLES = ROLES.filter(r => r.cat === 'traveler');

const BMR_CORE_ROLES = [
  { name:'Grandmother',      cat:'townsfolk', align:'good', ability:'You start knowing a good player & their character. If the Demon kills them, you die too.' },
  { name:'Sailor',           cat:'townsfolk', align:'good', ability:'Each night, choose an alive player: either you or they are drunk until dusk. You can\'t die.' },
  { name:'Chambermaid',      cat:'townsfolk', align:'good', ability:'Each night, choose 2 alive players (not yourself): you learn how many woke tonight due to their ability.' },
  { name:'Exorcist',         cat:'townsfolk', align:'good', ability:'Each night*, choose a player (different to last night): the Demon, if chosen, learns who you are then doesn\'t wake tonight.' },
  { name:'Innkeeper',        cat:'townsfolk', align:'good', ability:'Each night*, choose 2 players: they can\'t die tonight, but 1 is drunk until dusk.' },
  { name:'Gambler',          cat:'townsfolk', align:'good', ability:'Each night*, choose a player & guess their character: if you guess wrong, you die.' },
  { name:'Gossip',           cat:'townsfolk', align:'good', ability:'Each day, you may make a public statement. Tonight, if it was true, a player dies.' },
  { name:'Courtier',         cat:'townsfolk', align:'good', ability:'Once per game, at night, choose a character: they are drunk for 3 nights & 3 days.' },
  { name:'Professor',        cat:'townsfolk', align:'good', ability:'Once per game, at night*, choose a dead player: if they are a Townsfolk, they are resurrected.' },
  { name:'Minstrel',         cat:'townsfolk', align:'good', ability:'When a Minion dies by execution, all other players (except Travellers) are drunk until dusk tomorrow.' },
  { name:'Tea Lady',         cat:'townsfolk', align:'good', ability:'If both your alive neighbors are good, they can\'t die.' },
  { name:'Pacifist',         cat:'townsfolk', align:'good', ability:'Executed good players might not die.' },
  { name:'Fool',             cat:'townsfolk', align:'good', ability:'The 1st time you die, you don\'t.' },
  { name:'Tinker',           cat:'outsider',  align:'good', ability:'You might die at any time.' },
  { name:'Moonchild',        cat:'outsider',  align:'good', ability:'When you learn that you died, publicly choose 1 alive player. Tonight, if it was a good player, they die.' },
  { name:'Goon',             cat:'outsider',  align:'good', ability:'Each night, the 1st player to choose you with their ability is drunk until dusk. You become their alignment.' },
  { name:'Lunatic',          cat:'outsider',  align:'good', ability:'You think you are a Demon, but you are not. The Demon knows who you are & who you choose at night.' },
  { name:'Godfather',        cat:'minion',    align:'evil', ability:'You start knowing which Outsiders are in play. If 1 died today, choose a player tonight: they die. [-1 or +1 Outsider]' },
  { name:'Devil\'s Advocate',cat:'minion',    align:'evil', ability:'Each night, choose a living player (different to last night): if executed tomorrow, they don\'t die.' },
  { name:'Assassin',         cat:'minion',    align:'evil', ability:'Once per game, at night*, choose a player: they die, even if for some reason they could not.' },
  { name:'Mastermind',       cat:'minion',    align:'evil', ability:'If the Demon dies by execution (ending the game), play for 1 more day. If a player is then executed, their team loses.' },
  { name:'Zombuul',          cat:'demon',     align:'evil', ability:'Each night*, if no-one died today, choose a player: they die. The 1st time you die, you live but register as dead.' },
  { name:'Pukka',            cat:'demon',     align:'evil', ability:'Each night, choose a player: they are poisoned. The previously poisoned player dies then becomes healthy.' },
  { name:'Shabaloth',        cat:'demon',     align:'evil', ability:'Each night*, choose 2 players: they die. A dead player you chose last night might be regurgitated.' },
  { name:'Po',               cat:'demon',     align:'evil', ability:'Each night*, you may choose a player: they die. If your last choice was no-one, choose 3 players tonight.' },
];

const SNV_CORE_ROLES = [
  { name:'Clockmaker',    cat:'townsfolk', align:'good', ability:'You start knowing how many steps from the Demon to its nearest Minion.' },
  { name:'Dreamer',       cat:'townsfolk', align:'good', ability:'Each night, choose a player (not yourself or Travellers): you learn 1 good & 1 evil character, 1 of which is correct.' },
  { name:'Snake Charmer', cat:'townsfolk', align:'good', ability:'Each night, choose an alive player: a chosen Demon swaps characters & alignments with you & is then poisoned.' },
  { name:'Mathematician', cat:'townsfolk', align:'good', ability:'Each night, you learn how many players\' abilities worked abnormally (since dawn) due to another character\'s ability.' },
  { name:'Flowergirl',    cat:'townsfolk', align:'good', ability:'Each night*, you learn if a Demon voted today.' },
  { name:'Town Crier',    cat:'townsfolk', align:'good', ability:'Each night*, you learn if a Minion nominated today.' },
  { name:'Oracle',        cat:'townsfolk', align:'good', ability:'Each night*, you learn how many dead players are evil.' },
  { name:'Savant',        cat:'townsfolk', align:'good', ability:'Each day, you may visit the Storyteller to learn 2 things in private: 1 is true & 1 is false.' },
  { name:'Seamstress',    cat:'townsfolk', align:'good', ability:'Once per game, at night, choose 2 players (not yourself): you learn if they are the same alignment.' },
  { name:'Philosopher',   cat:'townsfolk', align:'good', ability:'Once per game, at night, choose a good character: gain that ability. If this character is in play, they are drunk.' },
  { name:'Artist',        cat:'townsfolk', align:'good', ability:'Once per game, during the day, privately ask the Storyteller any yes/no question.' },
  { name:'Juggler',       cat:'townsfolk', align:'good', ability:'On your 1st day, publicly guess up to 5 players\' characters. That night, you learn how many you got correct.' },
  { name:'Sage',          cat:'townsfolk', align:'good', ability:'If the Demon kills you, you learn that it is 1 of 2 players.' },
  { name:'Mutant',        cat:'outsider',  align:'good', ability:'If you are "mad" about being an Outsider, you might be executed.' },
  { name:'Sweetheart',    cat:'outsider',  align:'good', ability:'When you die, 1 player is drunk from now on.' },
  { name:'Barber',        cat:'outsider',  align:'good', ability:'If you died today or tonight, the Demon may choose 2 players (not another Demon) to swap characters.' },
  { name:'Klutz',         cat:'outsider',  align:'good', ability:'When you learn that you died, publicly choose 1 alive player: if they are evil, your team loses.' },
  { name:'Evil Twin',     cat:'minion',    align:'evil', ability:'You & an opposing player know each other. If the good player is executed, evil wins. Good can\'t win if you both live.' },
  { name:'Witch',         cat:'minion',    align:'evil', ability:'Each night, choose a player: if they nominate tomorrow, they die. If just 3 players live, you lose this ability.' },
  { name:'Cerenovus',     cat:'minion',    align:'evil', ability:'Each night, choose a player & a good character: they are "mad" they are this character tomorrow, or might be executed.' },
  { name:'Pit-Hag',       cat:'minion',    align:'evil', ability:'Each night*, choose a player & a character they become (if not in play). If a Demon is made, deaths tonight are arbitrary.' },
  { name:'Fang Gu',       cat:'demon',     align:'evil', ability:'Each night*, choose a player: they die. The 1st Outsider this kills becomes an evil Fang Gu & you die instead. [+1 Outsider]' },
  { name:'Vigormortis',   cat:'demon',     align:'evil', ability:'Each night*, choose a player: they die. Minions you kill keep their ability & poison 1 Townsfolk neighbor. [-1 Outsider]' },
  { name:'No Dashii',     cat:'demon',     align:'evil', ability:'Each night*, choose a player: they die. Your 2 Townsfolk neighbors are poisoned.' },
  { name:'Vortox',        cat:'demon',     align:'evil', ability:'Each night*, choose a player: they die. Townsfolk abilities yield false info. Each day, if no-one is executed, evil wins.' },
];

export function getRoles(script = 'tb') {
  const id = normalizeScript(script);
  if (id === 'tb') return ROLES;
  if (id === 'bmr') return [...BMR_CORE_ROLES, ...TRAVELER_ROLES];
  if (id === 'snv') return [...SNV_CORE_ROLES, ...TRAVELER_ROLES];
  return TRAVELER_ROLES;
}

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
  'Grandmother':    'assets/roles_bmr/Icon_grandmother.png',
  'Sailor':         'assets/roles_bmr/Icon_sailor.png',
  'Chambermaid':    'assets/roles_bmr/Icon_chambermaid.png',
  'Exorcist':       'assets/roles_bmr/Icon_exorcist.png',
  'Innkeeper':      'assets/roles_bmr/Icon_innkeeper.png',
  'Gambler':        'assets/roles_bmr/Icon_gambler.png',
  'Gossip':         'assets/roles_bmr/Icon_gossip.png',
  'Courtier':       'assets/roles_bmr/Icon_courtier.png',
  'Professor':      'assets/roles_bmr/Icon_professor.png',
  'Minstrel':       'assets/roles_bmr/Icon_minstrel.png',
  'Tea Lady':       'assets/roles_bmr/Icon_tealady.png',
  'Pacifist':       'assets/roles_bmr/Icon_pacifist.png',
  'Fool':           'assets/roles_bmr/Icon_fool.png',
  'Tinker':         'assets/roles_bmr/Icon_tinker.png',
  'Moonchild':      'assets/roles_bmr/Icon_moonchild.png',
  'Goon':           'assets/roles_bmr/Icon_goon.png',
  'Lunatic':        'assets/roles_bmr/Icon_lunatic.png',
  'Godfather':      'assets/roles_bmr/Icon_godfather.png',
  'Devil\'s Advocate': 'assets/roles_bmr/Icon_devilsadvocate.png',
  'Assassin':       'assets/roles_bmr/Icon_assassin.png',
  'Mastermind':     'assets/roles_bmr/Icon_mastermind.png',
  'Zombuul':        'assets/roles_bmr/Icon_zombuul.png',
  'Pukka':          'assets/roles_bmr/Icon_pukka.png',
  'Shabaloth':      'assets/roles_bmr/Icon_shabaloth.png',
  'Po':             'assets/roles_bmr/Icon_po.png',
  'Clockmaker':     'assets/roles_snv/Icon_clockmaker.png',
  'Dreamer':        'assets/roles_snv/Icon_dreamer.png',
  'Snake Charmer':  'assets/roles_snv/Icon_snakecharmer.png',
  'Mathematician':  'assets/roles_snv/Icon_mathematician.png',
  'Flowergirl':     'assets/roles_snv/Icon_flowergirl.png',
  'Town Crier':     'assets/roles_snv/Icon_towncrier.png',
  'Oracle':         'assets/roles_snv/Icon_oracle.png',
  'Savant':         'assets/roles_snv/Icon_savant.png',
  'Seamstress':     'assets/roles_snv/Icon_seamstress.png',
  'Philosopher':    'assets/roles_snv/Icon_philosopher.png',
  'Artist':         'assets/roles_snv/Icon_artist.png',
  'Juggler':        'assets/roles_snv/Icon_juggler.png',
  'Sage':           'assets/roles_snv/Icon_sage.png',
  'Mutant':         'assets/roles_snv/Icon_mutant.png',
  'Sweetheart':     'assets/roles_snv/Icon_sweetheart.png',
  'Barber':         'assets/roles_snv/Icon_barber.png',
  'Klutz':          'assets/roles_snv/Icon_klutz.png',
  'Evil Twin':      'assets/roles_snv/Icon_eviltwin.png',
  'Witch':          'assets/roles_snv/Icon_witch.png',
  'Cerenovus':      'assets/roles_snv/Icon_cerenovus.png',
  'Pit-Hag':        'assets/roles_snv/Icon_pithag.png',
  'Fang Gu':        'assets/roles_snv/Icon_fanggu.png',
  'Vigormortis':    'assets/roles_snv/Icon_vigormortis.png',
  'No Dashii':      'assets/roles_snv/Icon_nodashii.png',
  'Vortox':         'assets/roles_snv/Icon_vortox.png',
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

// ── Night order (Bad Moon Rising) ────────────────────
export const BMR_NIGHT_ORDER = {
  first: [
    { name: 'Minion info',       st: true, hint: 'If 7+ players: Minions learn each other; point to Demon.' },
    { name: 'Lunatic',           hint: 'If 7+ players: show fake Minions and 3 fake out-of-play good roles to Lunatic; then show Lunatic to Demon.' },
    { name: 'Demon info',        st: true, hint: 'If 7+ players: Demon learns Minions and 3 not-in-play good roles.' },
    { name: 'Sailor',            hint: 'Chooses a living player; either Sailor or chosen player is drunk until dusk.' },
    { name: 'Courtier',          hint: 'May choose a character to make drunk for 3 days and nights.' },
    { name: 'Godfather',         hint: 'Learns which Outsider characters are in play.' },
    { name: 'Devil\'s Advocate', hint: 'Chooses a living player who survives execution tomorrow.' },
    { name: 'Lunatic',           hint: 'If Lunatic saw a first-night Demon, run Lunatic Demon action and show targets to Demon.' },
    { name: 'Pukka',             hint: 'Chooses a player to poison.' },
    { name: 'Grandmother',       hint: 'Learns the marked Grandchild and their character.' },
    { name: 'Chambermaid',       hint: 'Chooses 2 living players and learns how many woke tonight due to ability.' },
    { name: 'Goon',              hint: 'If first chosen tonight by an ability: chooser is drunk and Goon may change alignment.', cond: true },
    { name: 'Dawn',              st: true, hint: 'Call for eyes open and announce deaths.' },
  ],
  other: [
    { name: 'Minstrel',          st: true, hint: 'Clear/apply "Everyone drunk" marker if a Minion died by execution today.' },
    { name: 'Sailor',            hint: 'Clear previous Sailor drunkenness, then Sailor chooses a living player.' },
    { name: 'Innkeeper',         hint: 'Clear old Innkeeper markers; choose 2 players protected tonight, 1 is drunk.' },
    { name: 'Courtier',          hint: 'Tick down active Courtier effect; if unused, may choose a character to make drunk 3 days/nights.', cond: true },
    { name: 'Gambler',           hint: 'Chooses a player and guessed character; if wrong, Gambler dies.' },
    { name: 'Devil\'s Advocate', hint: 'Chooses a living player who survives execution tomorrow.' },
    { name: 'Lunatic',           hint: 'Run Lunatic Demon action and show Lunatic targets to Demon if any.', cond: true },
    { name: 'Exorcist',          hint: 'Chooses a different player from last night; if Demon, Demon is shown Exorcist and does not act.' },
    { name: 'Zombuul',           hint: 'If nobody died today, Zombuul chooses a player to die.', cond: true },
    { name: 'Pukka',             hint: 'Previously poisoned player dies and is cured; Pukka chooses new poisoned player.' },
    { name: 'Shabaloth',         hint: 'May regurgitate one previously killed player; then chooses 2 players to die.' },
    { name: 'Po',                hint: 'If Po chose no-one last night, chooses 3 players; otherwise chooses none or 1.' },
    { name: 'Assassin',          hint: 'If ability unused, may choose a player to die.', cond: true },
    { name: 'Godfather',         hint: 'If an Outsider died today, chooses a player to die.', cond: true },
    { name: 'Professor',         hint: 'If ability unused, may choose a dead Townsfolk to resurrect.', cond: true },
    { name: 'Gossip',            st: true, hint: 'If today\'s Gossip statement was true, a player dies.', cond: true },
    { name: 'Tinker',            st: true, hint: 'Tinker might die.', cond: true },
    { name: 'Moonchild',         st: true, hint: 'If Moonchild chose today and target is good, target dies.', cond: true },
    { name: 'Grandmother',       st: true, hint: 'If Demon killed Grandchild, Grandmother dies.', cond: true },
    { name: 'Chambermaid',       hint: 'Chooses 2 living players and learns how many woke tonight due to ability.' },
    { name: 'Goon',              hint: 'If first chosen tonight by an ability: chooser is drunk and Goon may change alignment.', cond: true },
    { name: 'Dawn',              st: true, hint: 'Call for eyes open and announce deaths.' },
  ],
};

// ── Night order (Sects & Violets) ───────────────────
export const SNV_NIGHT_ORDER = {
  first: [
    { name: 'Minion info',   st: true, hint: 'Minions learn each other and the Demon.' },
    { name: 'Demon info',    st: true, hint: 'Demon learns Minions and any script setup info.' },
    { name: 'Clockmaker',    hint: 'Learns distance from Demon to nearest Minion.' },
    { name: 'Dreamer',       hint: 'Chooses a player and learns 1 good + 1 evil character, one correct.' },
    { name: 'Snake Charmer', hint: 'Chooses an alive player; if Demon, swap characters/alignments and poison new Demon.' },
    { name: 'Mathematician', hint: 'Learns how many abilities worked abnormally since dawn due to another ability.' },
    { name: 'Flowergirl',    hint: 'Learns if a Demon voted today (from day 1 onward).', cond: true },
    { name: 'Seamstress',    hint: 'If unused, may choose 2 players to learn if they are same alignment.', cond: true },
    { name: 'Philosopher',   hint: 'If unused, may choose a good character and gain that ability.', cond: true },
    { name: 'Evil Twin',     hint: 'Evil Twin and chosen good Twin learn each other.' },
    { name: 'Witch',         hint: 'Chooses a player who dies if they nominate tomorrow.' },
    { name: 'Cerenovus',     hint: 'Chooses a player and good character; player is mad they are that character tomorrow.' },
    { name: 'Dawn',          st: true, hint: 'Call for eyes open and announce deaths.' },
  ],
  other: [
    { name: 'Philosopher',   hint: 'If unused, may choose a good character and gain that ability.', cond: true },
    { name: 'Dreamer',       hint: 'Chooses a player and learns 1 good + 1 evil character, one correct.' },
    { name: 'Snake Charmer', hint: 'Chooses an alive player; if Demon, swap and poison.' },
    { name: 'Mathematician', hint: 'Learns how many abilities worked abnormally since dawn.' },
    { name: 'Flowergirl',    hint: 'Learns if a Demon voted today.' },
    { name: 'Town Crier',    hint: 'Learns if a Minion nominated today.' },
    { name: 'Oracle',        hint: 'Learns how many dead players are evil.' },
    { name: 'Seamstress',    hint: 'If unused, may choose 2 players to learn if they are same alignment.', cond: true },
    { name: 'Juggler',       hint: 'The night after first-day juggles, learns how many guesses were correct.', cond: true },
    { name: 'Witch',         hint: 'Chooses a player who dies if they nominate tomorrow.', cond: true },
    { name: 'Cerenovus',     hint: 'Chooses a player and good character for tomorrow madness.', cond: true },
    { name: 'Pit-Hag',       hint: 'Chooses a player and character they become (if not in play).', cond: true },
    { name: 'Fang Gu',       hint: 'Chooses a player to die. First Outsider killed becomes evil Fang Gu.', cond: true },
    { name: 'Vigormortis',   hint: 'Chooses a player to die. Minions killed by Vigormortis keep ability.', cond: true },
    { name: 'No Dashii',     hint: 'Chooses a player to die; Townsfolk neighbors are poisoned.', cond: true },
    { name: 'Vortox',        hint: 'Chooses a player to die; Townsfolk info is false while in play.', cond: true },
    { name: 'Barber',        st: true, hint: 'If Barber died, Demon may choose 2 players to swap characters.', cond: true },
    { name: 'Sage',          hint: 'If killed by Demon, learns two possible Demon players.', cond: true },
    { name: 'Sweetheart',    st: true, hint: 'If Sweetheart died, choose a player to become drunk.' , cond: true },
    { name: 'Dawn',          st: true, hint: 'Call for eyes open and announce deaths.' },
  ],
};

const EMPTY_NIGHT_ORDER = { first: [], other: [] };

export function getNightOrder(script = 'tb') {
  const id = normalizeScript(script);
  if (id === 'tb') return NIGHT_ORDER;
  if (id === 'bmr') return BMR_NIGHT_ORDER;
  if (id === 'snv') return SNV_NIGHT_ORDER;
  return EMPTY_NIGHT_ORDER;
}

export function getCharacterCount(script = 'tb') {
  const baseRows = [
    [3,3,5,5,5,7,7,7,9,9,9],
    [0,1,0,1,2,0,1,2,0,1,2],
    [1,1,1,1,1,2,2,2,3,3,3],
    [1,1,1,1,1,1,1,1,1,1,1],
  ];
  return {
    rows: baseRows,
    note: 'All scripts use the standard Clocktower character count distribution. 15+ follows the same pattern as 15 (9/2/3/1).',
  };
}

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
