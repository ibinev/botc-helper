// ── Roles image reference ──────────────────────────────
// Relative path to the role reference image next to index.html.
// Leave empty ('') to hide the button.
export const ROLES_IMG_URL = 'assets/roles_en.png';

const BASE_SCRIPT_OPTIONS = [
  { id: 'tb', label: 'Trouble Brewing' },
  { id: 'bmr', label: 'Bad Moon Rising' },
  { id: 'snv', label: 'Sects and Violets' },
];

const ROLE_CATEGORY_ORDER = ['townsfolk','outsider','minion','demon','traveler'];

let CUSTOM_SCRIPTS = [];

export const SCRIPT_OPTIONS = BASE_SCRIPT_OPTIONS;

function normalizeLayout(layout, roleList) {
  const known = new Set(roleList || []);
  const byCat = {};
  ROLE_CATEGORY_ORDER.forEach(cat => { byCat[cat] = { left: [], right: [] }; });

  (layout && typeof layout === 'object' ? ROLE_CATEGORY_ORDER : []).forEach(cat => {
    const cols = layout[cat] || {};
    ['left', 'right'].forEach(col => {
      const names = Array.isArray(cols[col]) ? cols[col] : [];
      names.forEach(name => {
        if (known.has(name) && !byCat[cat].left.includes(name) && !byCat[cat].right.includes(name)) {
          byCat[cat][col].push(name);
        }
      });
    });
  });

  return byCat;
}

export function setCustomScripts(customScripts = []) {
  const seen = new Set();
  CUSTOM_SCRIPTS = (customScripts || [])
    .map(s => {
      const roles = Array.isArray(s?.roles) ? [...new Set(s.roles.filter(Boolean))] : [];
      return {
      id: String(s?.id || '').trim(),
      label: String(s?.label || '').trim(),
      roles,
      layout: normalizeLayout(s?.layout, roles),
    };
    })
    .filter(s => s.id && s.label && !seen.has(s.id) && (seen.add(s.id), true));
}

export function getCustomScripts() {
  return CUSTOM_SCRIPTS.map(s => ({
    ...s,
    roles: [...s.roles],
    layout: normalizeLayout(s.layout, s.roles),
  }));
}

export function getScriptRoleLayout(script) {
  const custom = getCustomScript(script);
  if (!custom) return null;
  return normalizeLayout(custom.layout, custom.roles);
}

export function getScriptOptions() {
  return [
    ...BASE_SCRIPT_OPTIONS,
    ...CUSTOM_SCRIPTS.map(s => ({ id: s.id, label: s.label })),
  ];
}

export function normalizeScript(script) {
  return getScriptOptions().some(s => s.id === script) ? script : 'tb';
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

const EXPERIMENTAL_ROLES = [
  { name:'Acrobat', cat:'outsider', align:'good', ability:'Each night*, if either good living neighbour is drunk or poisoned, you die.' },
  { name:'Al-Hadikhia', cat:'demon', align:'evil', ability:'Each night*, choose 3 players (all players learn who): each silently chooses to live or die, but if all live, all die.' },
  { name:'Alchemist', cat:'townsfolk', align:'good', ability:'You have a not-in-play Minion ability.' },
  { name:'Alsaahir', cat:'townsfolk', align:'good', ability:'Each day, if you publicly guess which players are Minion(s) and which are Demon(s), good wins' },
  { name:'Amnesiac', cat:'townsfolk', align:'good', ability:'You do not know what your ability is. Each day, privately guess what it is: you learn how accurate you are.' },
  { name:'Atheist', cat:'townsfolk', align:'good', ability:'The Storyteller can break the game rules & if executed, good wins, even if you are dead. [No evil characters]' },
  { name:'Balloonist', cat:'townsfolk', align:'good', ability:'Each night, you learn 1 player of each character type, until there are no more types to learn. [+1 Outsider]' },
  { name:'Banshee', cat:'townsfolk', align:'good', ability:'If the Demon kills you, all players learn this. From now on, you may nominate twice per day and vote twice per nomination.' },
  { name:'Big Wig', cat:'townsfolk', align:'good', ability:'Each nominee chooses a player: until voting, only they may speak & they are mad the nominee is good or they might die.' },
  { name:'Boffin', cat:'minion', align:'evil', ability:`The Demon (even if drunk or poisoned) has a not-in-play good character's ability. You both know which.` },
  { name:'Boomdandy', cat:'minion', align:'evil', ability:'If you are executed, all but 3 players die. 1 minute later, the player with the most players pointing at them dies.' },
  { name:'Bootlegger', cat:'townsfolk', align:'good', ability:'This script has homebrew characters or rules.' },
  { name:'Bounty Hunter', cat:'townsfolk', align:'good', ability:'You start knowing 1 evil player. If the player you know dies, you learn another evil player tonight. [1 Townsfolk is evil]' },
  { name:'Cacklejack', cat:'traveler', align:'good', ability:'Each day, choose a player: a different player changes character tonight.' },
  { name:'Cannibal', cat:'townsfolk', align:'good', ability:'You have the ability of the recently killed executee. If they are evil, you are poisoned until a good player dies by execution.' },
  { name:'Choirboy', cat:'townsfolk', align:'good', ability:'If the Demon kills the King, you learn which player is the Demon. [+ the King]' },
  { name:'Cult Leader', cat:'townsfolk', align:'good', ability:'Each night, you become the alignment of an alive neighbour. If all good players choose to join your cult, your team wins.' },
  { name:'Damsel', cat:'outsider', align:'good', ability:'All Minions know you are in play. If a Minion publicly guesses you (once), your team loses.' },
  { name:'Deus ex Fiasco', cat:'traveler', align:'good', ability:'At least once per game, the Storyteller will make a mistake, correct it, and publicly admit to it.' },
  { name:'Engineer', cat:'townsfolk', align:'good', ability:'Once per game, at night, choose which Minions or which Demon is in play.' },
  { name:'Farmer', cat:'townsfolk', align:'good', ability:'If you die at night, an alive good player becomes a Farmer.' },
  { name:'Fearmonger', cat:'minion', align:'evil', ability:'Each night, choose a player. If you nominate & execute them, their team loses. All players know if you choose a new player.' },
  { name:'Ferryman', cat:'traveler', align:'good', ability:'On the final day, all dead players regain their vote token.' },
  { name:'Fisherman', cat:'townsfolk', align:'good', ability:'Once per game, during the day, visit the Storyteller for some advice to help you win.' },
  { name:'Gangster', cat:'traveler', align:'good', ability:'Once per day, you may choose to kill an alive neighbour, if your other alive neighbour agrees.' },
  { name:'Gardener', cat:'townsfolk', align:'good', ability:`The Storyteller assigns all players' characters.` },
  { name:'General', cat:'townsfolk', align:'good', ability:'Each night, you learn which alignment the Storyteller believes is winning: good, evil, or neither.' },
  { name:'Gnome', cat:'traveler', align:'good', ability:'All players start knowing a player of your alignment. You may choose to kill anyone who nominates them.' },
  { name:'Goblin', cat:'minion', align:'evil', ability:'If you publicly claim to be the Goblin when nominated & are executed that day, your team wins.' },
  { name:'God of Ug', cat:'townsfolk', align:'good', ability:'One Ug hat. When wear Ug hat, must speak one sound at a time but vote twice. If fail, pass Ug hat.' },
  { name:'God of Ug (Ug Mode)', cat:'townsfolk', align:'good', ability:'One Ug hat. When wear Ug hat, must speak one sound at a time but vote twice. If fail, pass Ug hat.' },
  { name:'Golem', cat:'outsider', align:'good', ability:'You may only nominate once per game. When you do, if the nominee is not the Demon, they die.' },
  { name:'Harpy', cat:'minion', align:'evil', ability:'Each night, choose 2 players: tomorrow, the 1st player is mad that the 2nd is evil, or one or both might die.' },
  { name:'Hatter', cat:'outsider', align:'good', ability:'If you died today or tonight, the Minion & Demon players may choose new Minion & Demon characters to be.' },
  { name:'Heretic', cat:'outsider', align:'good', ability:'Whoever wins, loses & whoever loses, wins, even if you are dead.' },
  { name:'Hermit', cat:'outsider', align:'good', ability:'You have all Outsider abilities. [-0 or -1 Outsider]' },
  { name:'High Priestess', cat:'townsfolk', align:'good', ability:'Each night, learn which player the Storyteller believes you should talk to most.' },
  { name:'Hindu', cat:'townsfolk', align:'good', ability:'The first 4 players to die are immediately reincarnated as Travellers of the same alignment.' },
  { name:'Huntsman', cat:'townsfolk', align:'good', ability:'Once per game, at night, choose a living player: the Damsel, if chosen, becomes a not-in-play Townsfolk. [+the Damsel]' },
  { name:'Kazali', cat:'demon', align:'evil', ability:'Each night*, choose a player: they die. [You choose which players are which Minions. -? to +? Outsiders]' },
  { name:'King', cat:'townsfolk', align:'good', ability:'Each night, if the dead outnumber the living, you learn 1 alive character. The Demon knows who you are.' },
  { name:'Knaves', cat:'townsfolk', align:'good', ability:'There are 2 Storytellers: one lies & one tells the truth. Once per game, at dusk, they might switch.' },
  { name:'Knight', cat:'townsfolk', align:'good', ability:'You start knowing 2 players that are not the Demon.' },
  { name:'Legion', cat:'demon', align:'evil', ability:'Each night*, a player might die. Executions fail if only evil voted. You register as a Minion too. [Most players are Legion]' },
  { name:'Leviathan', cat:'demon', align:'evil', ability:'If more than 1 good player is executed, you win. All players know you are in play. After day 5, evil wins.' },
  { name:'Lil\' Monsta', cat:'demon', align:'evil', ability:'Each night, Minions choose who babysits Lil\' Monsta\'s token & "is the Demon". A player dies each night*. [+1 Minion]' },
  { name:'Lleech', cat:'demon', align:'evil', ability:'Each night*, choose a player: they die. You start by choosing an alive player: they are poisoned - you die if & only if they die.' },
  { name:'Lord of Typhon', cat:'demon', align:'evil', ability:'Each night*, choose a player: they die. [Evil characters are in a line. You are in the middle. +1 Minion. -? to +? Outsiders]' },
  { name:'Lycanthrope', cat:'townsfolk', align:'good', ability:'Each night*, choose a living player: if good, they die, but they are the only player that can die tonight.' },
  { name:'Magician', cat:'townsfolk', align:'good', ability:'The Demon thinks you are a Minion. Minions think you are a Demon.' },
  { name:'Marionette', cat:'minion', align:'evil', ability:'You think you are a good character but you are not. The Demon knows who you are. [You neighbour the Demon]' },
  { name:'Mezepheles', cat:'minion', align:'evil', ability:'You start knowing a secret word. The 1st good player to say this word becomes evil that night.' },
  { name:'Nightwatchman', cat:'townsfolk', align:'good', ability:'Once per game, at night, choose a player: they learn who you are.' },
  { name:'Noble', cat:'townsfolk', align:'good', ability:'You start knowing 3 players, 1 and only 1 of which is evil.' },
  { name:'Ogre', cat:'outsider', align:'good', ability:'Experimental character placeholder. Update with official ability text if needed.' },
  { name:'Ojo', cat:'demon', align:'evil', ability:'Experimental character placeholder. Update with official ability text if needed.' },
  { name:'Organ Grinder', cat:'minion', align:'evil', ability:'Experimental character placeholder. Update with official ability text if needed.' },
  { name:'Pixie', cat:'townsfolk', align:'good', ability:'You start knowing 1 in-play Townsfolk. If you were mad that you were this character, you gain their ability when they die.' },
  { name:'Plague Doctor', cat:'outsider', align:'good', ability:'Experimental character placeholder. Update with official ability text if needed.' },
  { name:'Politician', cat:'outsider', align:'good', ability:'If you were the player most responsible for your team losing, you change alignment & win, even if dead.' },
  { name:'Pope', cat:'townsfolk', align:'good', ability:'Experimental character placeholder. Update with official ability text if needed.' },
  { name:'Poppy Grower', cat:'townsfolk', align:'good', ability:'Minions & Demons do not know each other. If you die, they learn who each other are that night.' },
  { name:'Preacher', cat:'townsfolk', align:'good', ability:'Each night, choose a player: a Minion, if chosen, learns this. All chosen Minions have no ability.' },
  { name:'Princess', cat:'townsfolk', align:'good', ability:'Experimental character placeholder. Update with official ability text if needed.' },
  { name:'Psychopath', cat:'minion', align:'evil', ability:'Each day, before nominations, you may publicly choose a player: they die. If executed, you only die if you lose roshambo.' },
  { name:'Puzzlemaster', cat:'outsider', align:'good', ability:'1 player is drunk, even if you die. If you guess (once) who it is, learn the Demon player, but guess wrong & get false info.' },
  { name:'Riot', cat:'demon', align:'evil', ability:'Nominees die, but may nominate again immediately (on day 3, they must). After day 3, evil wins. [All Minions are Riot]' },
  { name:'Shugenja', cat:'townsfolk', align:'good', ability:'Experimental character placeholder. Update with official ability text if needed.' },
  { name:'Snitch', cat:'outsider', align:'good', ability:'Minions start knowing 3 not-in-play characters.' },
  { name:'Steward', cat:'townsfolk', align:'good', ability:'Experimental character placeholder. Update with official ability text if needed.' },
  { name:'Storm Catcher', cat:'townsfolk', align:'good', ability:'Experimental character placeholder. Update with official ability text if needed.' },
  { name:'Summoner', cat:'minion', align:'evil', ability:'Experimental character placeholder. Update with official ability text if needed.' },
  { name:'Tor', cat:'townsfolk', align:'good', ability:'Experimental character placeholder. Update with official ability text if needed.' },
  { name:'Ventriloquist', cat:'townsfolk', align:'good', ability:'Experimental character placeholder. Update with official ability text if needed.' },
  { name:'Village Idiot', cat:'townsfolk', align:'good', ability:'Experimental character placeholder. Update with official ability text if needed.' },
  { name:'Vizier', cat:'minion', align:'evil', ability:'Experimental character placeholder. Update with official ability text if needed.' },
  { name:'Widow', cat:'minion', align:'evil', ability:'On your 1st night, look at the Grimoire and choose a player: they are poisoned. 1 good player knows a Widow is in play.' },
  { name:'Wizard', cat:'minion', align:'evil', ability:'Experimental character placeholder. Update with official ability text if needed.' },
  { name:'Wraith', cat:'minion', align:'evil', ability:'Experimental character placeholder. Update with official ability text if needed.' },
  { name:'Xaan', cat:'minion', align:'evil', ability:'Experimental character placeholder. Update with official ability text if needed.' },
  { name:'Yaggababble', cat:'demon', align:'evil', ability:'Experimental character placeholder. Update with official ability text if needed.' },
  { name:'Zealot', cat:'outsider', align:'good', ability:'Experimental character placeholder. Update with official ability text if needed.' },
  { name:'Zenomancer', cat:'townsfolk', align:'good', ability:'Experimental character placeholder. Update with official ability text if needed.' },
];

const ALL_KNOWN_ROLES = [
  ...ROLES,
  ...BMR_CORE_ROLES,
  ...SNV_CORE_ROLES,
  ...TRAVELER_ROLES,
  ...EXPERIMENTAL_ROLES,
];

const EXPERIMENTAL_ROLE_NAMES = new Set(EXPERIMENTAL_ROLES.map(r => r.name));

const ROLE_BY_NAME = (() => {
  const map = new Map();
  ALL_KNOWN_ROLES.forEach(role => {
    if (!map.has(role.name)) map.set(role.name, role);
  });
  return map;
})();

function getCustomScript(script) {
  return CUSTOM_SCRIPTS.find(s => s.id === script) || null;
}

export function getAllRoles() {
  const roles = [...ROLE_BY_NAME.values()];
  const order = { townsfolk: 0, outsider: 1, minion: 2, demon: 3, traveler: 4 };
  roles.sort((a, b) => {
    const ca = order[a.cat] ?? 99;
    const cb = order[b.cat] ?? 99;
    if (ca !== cb) return ca - cb;
    return a.name.localeCompare(b.name);
  });
  return roles;
}

export function isExperimentalRole(name) {
  return EXPERIMENTAL_ROLE_NAMES.has(name);
}

export function getRoles(script = 'tb') {
  const id = normalizeScript(script);
  if (id === 'tb') return ROLES;
  if (id === 'bmr') return [...BMR_CORE_ROLES, ...TRAVELER_ROLES];
  if (id === 'snv') return [...SNV_CORE_ROLES, ...TRAVELER_ROLES];
  const custom = getCustomScript(id);
  if (custom) {
    const layout = normalizeLayout(custom.layout, custom.roles);
    const orderedNames = [];
    ROLE_CATEGORY_ORDER.forEach(cat => {
      orderedNames.push(...layout[cat].left, ...layout[cat].right);
    });
    custom.roles.forEach(name => {
      if (!orderedNames.includes(name)) orderedNames.push(name);
    });
    return orderedNames.map(name => ROLE_BY_NAME.get(name)).filter(Boolean);
  }
  return TRAVELER_ROLES;
}

const EXPERIMENTAL_ICON_DEFAULTS = {
  'Acrobat': 'assets/roles/experimental/Icon_acrobat.png',
  'Al-Hadikhia': 'assets/roles/experimental/Icon_alhadikhia.png',
  'Alchemist': 'assets/roles/experimental/Icon_alchemist.png',
  'Alsaahir': 'assets/roles/experimental/Icon_alsaahir.png',
  'Amnesiac': 'assets/roles/experimental/Icon_amnesiac.png',
  'Atheist': 'assets/roles/experimental/Icon_atheist.png',
  'Balloonist': 'assets/roles/experimental/Icon_balloonist.png',
  'Banshee': 'assets/roles/experimental/Icon_banshee.png',
  'Big Wig': 'assets/roles/experimental/Icon_bigwig.png',
  'Boffin': 'assets/roles/experimental/Icon_boffin.png',
  'Boomdandy': 'assets/roles/experimental/Icon_boomdandy.png',
  'Bootlegger': 'assets/roles/experimental/Icon_bootlegger.png',
  'Bounty Hunter': 'assets/roles/experimental/Icon_bountyhunter.png',
  'Cacklejack': 'assets/roles/experimental/Icon_cacklejack.png',
  'Cannibal': 'assets/roles/experimental/Icon_cannibal.png',
  'Choirboy': 'assets/roles/experimental/Icon_choirboy.png',
  'Cult Leader': 'assets/roles/experimental/Icon_cultleader.png',
  'Damsel': 'assets/roles/experimental/Icon_damsel.png',
  'Deus ex Fiasco': 'assets/roles/experimental/Icon_deusexfiasco.png',
  'Engineer': 'assets/roles/experimental/Icon_engineer.png',
  'Farmer': 'assets/roles/experimental/Icon_farmer.png',
  'Fearmonger': 'assets/roles/experimental/Icon_fearmonger.png',
  'Ferryman': 'assets/roles/experimental/Icon_ferryman.png',
  'Fisherman': 'assets/roles/experimental/Icon_fisherman.png',
  'Gardener': 'assets/roles/experimental/Icon_gardener.png',
  'General': 'assets/roles/experimental/Icon_general.png',
  'Gnome': 'assets/roles/experimental/Icon_gnome.png',
  'Goblin': 'assets/roles/experimental/Icon_goblin.png',
  'God of Ug': 'assets/roles/experimental/Icon_godofug.png',
  'God of Ug (Ug Mode)': 'assets/roles/experimental/Icon_godofugugmode.png',
  'Golem': 'assets/roles/experimental/Icon_golem.png',
  'Harpy': 'assets/roles/experimental/Icon_harpy.png',
  'Hatter': 'assets/roles/experimental/Icon_hatter.png',
  'Heretic': 'assets/roles/experimental/Icon_heretic.png',
  'Hermit': 'assets/roles/experimental/Icon_hermit.png',
  'High Priestess': 'assets/roles/experimental/Icon_highpriestess.png',
  'Hindu': 'assets/roles/experimental/Icon_hindu.png',
  'Huntsman': 'assets/roles/experimental/Icon_huntsman.png',
  'Kazali': 'assets/roles/experimental/Icon_kazali.png',
  'King': 'assets/roles/experimental/Icon_king.png',
  'Knaves': 'assets/roles/experimental/Icon_knaves.png',
  'Knight': 'assets/roles/experimental/Icon_knight.png',
  'Legion': 'assets/roles/experimental/Icon_legion.png',
  'Leviathan': 'assets/roles/experimental/Icon_leviathan.png',
  'Lil\' Monsta': 'assets/roles/experimental/Icon_lilmonsta.png',
  'Lleech': 'assets/roles/experimental/Icon_lleech.png',
  'Lord of Typhon': 'assets/roles/experimental/Icon_lordoftyphon.png',
  'Lycanthrope': 'assets/roles/experimental/Icon_lycanthrope.png',
  'Magician': 'assets/roles/experimental/Icon_magician.png',
  'Marionette': 'assets/roles/experimental/Icon_marionette.png',
  'Mezepheles': 'assets/roles/experimental/Icon_mezepheles.png',
  'Nightwatchman': 'assets/roles/experimental/Icon_nightwatchman.png',
  'Noble': 'assets/roles/experimental/Icon_noble.png',
  'Ogre': 'assets/roles/experimental/Icon_ogre.png',
  'Ojo': 'assets/roles/experimental/Icon_ojo.png',
  'Organ Grinder': 'assets/roles/experimental/Icon_organgrinder.png',
  'Pixie': 'assets/roles/experimental/Icon_pixie.png',
  'Plague Doctor': 'assets/roles/experimental/Icon_plaguedoctor.png',
  'Politician': 'assets/roles/experimental/Icon_politician.png',
  'Pope': 'assets/roles/experimental/Icon_pope.png',
  'Poppy Grower': 'assets/roles/experimental/Icon_poppygrower.png',
  'Preacher': 'assets/roles/experimental/Icon_preacher.png',
  'Princess': 'assets/roles/experimental/Icon_princess.png',
  'Psychopath': 'assets/roles/experimental/Icon_psychopath.png',
  'Puzzlemaster': 'assets/roles/experimental/Icon_puzzlemaster.png',
  'Riot': 'assets/roles/experimental/Icon_riot.png',
  'Shugenja': 'assets/roles/experimental/Icon_shugenja.png',
  'Snitch': 'assets/roles/experimental/Icon_snitch.png',
  'Steward': 'assets/roles/experimental/Icon_steward.png',
  'Storm Catcher': 'assets/roles/experimental/Icon_stormcatcher.png',
  'Summoner': 'assets/roles/experimental/Icon_summoner.png',
  'Tor': 'assets/roles/experimental/Icon_tor.png',
  'Ventriloquist': 'assets/roles/experimental/Icon_ventriloquist.png',
  'Village Idiot': 'assets/roles/experimental/Icon_villageidiot.png',
  'Vizier': 'assets/roles/experimental/Icon_vizier.png',
  'Widow': 'assets/roles/experimental/Icon_widow.png',
  'Wizard': 'assets/roles/experimental/Icon_wizard.png',
  'Wraith': 'assets/roles/experimental/Icon_wraith.png',
  'Xaan': 'assets/roles/experimental/Icon_xaan.png',
  'Yaggababble': 'assets/roles/experimental/Icon_yaggababble.png',
  'Zealot': 'assets/roles/experimental/Icon_zealot.png',
  'Zenomancer': 'assets/roles/experimental/Icon_zenomancer.png',
};

// ── Role icons ─────────────────────────────────────────
export const ROLE_ICONS = {
  'Washerwoman':    'assets/roles/trouble-brewing/Icon_washerwoman.png',
  'Librarian':      'assets/roles/trouble-brewing/Icon_librarian.png',
  'Investigator':   'assets/roles/trouble-brewing/Icon_investigator.png',
  'Chef':           'assets/roles/trouble-brewing/Icon_chef.png',
  'Empath':         'assets/roles/trouble-brewing/Icon_empath.png',
  'Fortune Teller': 'assets/roles/trouble-brewing/Icon_fortuneteller.png',
  'Undertaker':     'assets/roles/trouble-brewing/Icon_undertaker.png',
  'Monk':           'assets/roles/trouble-brewing/Icon_monk.png',
  'Ravenkeeper':    'assets/roles/trouble-brewing/Icon_ravenkeeper.png',
  'Virgin':         'assets/roles/trouble-brewing/Icon_virgin.png',
  'Slayer':         'assets/roles/trouble-brewing/Icon_slayer.png',
  'Soldier':        'assets/roles/trouble-brewing/Icon_soldier.png',
  'Mayor':          'assets/roles/trouble-brewing/Icon_mayor.png',
  'Butler':         'assets/roles/trouble-brewing/Icon_butler.png',
  'Drunk':          'assets/roles/trouble-brewing/Icon_drunk.png',
  'Recluse':        'assets/roles/trouble-brewing/Icon_recluse.png',
  'Saint':          'assets/roles/trouble-brewing/Icon_saint.png',
  'Poisoner':       'assets/roles/trouble-brewing/Icon_poisoner.png',
  'Spy':            'assets/roles/trouble-brewing/Icon_spy.png',
  'Scarlet Woman':  'assets/roles/trouble-brewing/Icon_scarletwoman.png',
  'Baron':          'assets/roles/trouble-brewing/Icon_baron.png',
  'Imp':            'assets/roles/trouble-brewing/Icon_imp.png',
  'Apprentice':     'assets/roles/trouble-brewing/Icon_apprentice.png',
  'Barista':        'assets/roles/trouble-brewing/Icon_barista.png',
  'Beggar':         'assets/roles/trouble-brewing/Icon_beggar.png',
  'Bone Collector': 'assets/roles/trouble-brewing/Icon_bonecollector.png',
  'Bureaucrat':     'assets/roles/trouble-brewing/Icon_bureaucrat.png',
  'Butcher':        'assets/roles/trouble-brewing/Icon_butcher.png',
  'Deviant':        'assets/roles/trouble-brewing/Icon_deviant.png',
  'Gangster':       'assets/roles/trouble-brewing/Icon_gangster.png',
  'Gunslinger':     'assets/roles/trouble-brewing/Icon_gunslinger.png',
  'Harlot':         'assets/roles/trouble-brewing/Icon_harlot.png',
  'Judge':          'assets/roles/trouble-brewing/Icon_judge.png',
  'Matron':         'assets/roles/trouble-brewing/Icon_matron.png',
  'Scapegoat':      'assets/roles/trouble-brewing/Icon_scapegoat.png',
  'Thief':          'assets/roles/trouble-brewing/Icon_thief.png',
  'Grandmother':    'assets/roles/bad-moon-rising/Icon_grandmother.png',
  'Sailor':         'assets/roles/bad-moon-rising/Icon_sailor.png',
  'Chambermaid':    'assets/roles/bad-moon-rising/Icon_chambermaid.png',
  'Exorcist':       'assets/roles/bad-moon-rising/Icon_exorcist.png',
  'Innkeeper':      'assets/roles/bad-moon-rising/Icon_innkeeper.png',
  'Gambler':        'assets/roles/bad-moon-rising/Icon_gambler.png',
  'Gossip':         'assets/roles/bad-moon-rising/Icon_gossip.png',
  'Courtier':       'assets/roles/bad-moon-rising/Icon_courtier.png',
  'Professor':      'assets/roles/bad-moon-rising/Icon_professor.png',
  'Minstrel':       'assets/roles/bad-moon-rising/Icon_minstrel.png',
  'Tea Lady':       'assets/roles/bad-moon-rising/Icon_tealady.png',
  'Pacifist':       'assets/roles/bad-moon-rising/Icon_pacifist.png',
  'Fool':           'assets/roles/bad-moon-rising/Icon_fool.png',
  'Tinker':         'assets/roles/bad-moon-rising/Icon_tinker.png',
  'Moonchild':      'assets/roles/bad-moon-rising/Icon_moonchild.png',
  'Goon':           'assets/roles/bad-moon-rising/Icon_goon.png',
  'Lunatic':        'assets/roles/bad-moon-rising/Icon_lunatic.png',
  'Godfather':      'assets/roles/bad-moon-rising/Icon_godfather.png',
  'Devil\'s Advocate': 'assets/roles/bad-moon-rising/Icon_devilsadvocate.png',
  'Assassin':       'assets/roles/bad-moon-rising/Icon_assassin.png',
  'Mastermind':     'assets/roles/bad-moon-rising/Icon_mastermind.png',
  'Zombuul':        'assets/roles/bad-moon-rising/Icon_zombuul.png',
  'Pukka':          'assets/roles/bad-moon-rising/Icon_pukka.png',
  'Shabaloth':      'assets/roles/bad-moon-rising/Icon_shabaloth.png',
  'Po':             'assets/roles/bad-moon-rising/Icon_po.png',
  'Clockmaker':     'assets/roles/sects-and-violets/Icon_clockmaker.png',
  'Dreamer':        'assets/roles/sects-and-violets/Icon_dreamer.png',
  'Snake Charmer':  'assets/roles/sects-and-violets/Icon_snakecharmer.png',
  'Mathematician':  'assets/roles/sects-and-violets/Icon_mathematician.png',
  'Flowergirl':     'assets/roles/sects-and-violets/Icon_flowergirl.png',
  'Town Crier':     'assets/roles/sects-and-violets/Icon_towncrier.png',
  'Oracle':         'assets/roles/sects-and-violets/Icon_oracle.png',
  'Savant':         'assets/roles/sects-and-violets/Icon_savant.png',
  'Seamstress':     'assets/roles/sects-and-violets/Icon_seamstress.png',
  'Philosopher':    'assets/roles/sects-and-violets/Icon_philosopher.png',
  'Artist':         'assets/roles/sects-and-violets/Icon_artist.png',
  'Juggler':        'assets/roles/sects-and-violets/Icon_juggler.png',
  'Sage':           'assets/roles/sects-and-violets/Icon_sage.png',
  'Mutant':         'assets/roles/sects-and-violets/Icon_mutant.png',
  'Sweetheart':     'assets/roles/sects-and-violets/Icon_sweetheart.png',
  'Barber':         'assets/roles/sects-and-violets/Icon_barber.png',
  'Klutz':          'assets/roles/sects-and-violets/Icon_klutz.png',
  'Evil Twin':      'assets/roles/sects-and-violets/Icon_eviltwin.png',
  'Witch':          'assets/roles/sects-and-violets/Icon_witch.png',
  'Cerenovus':      'assets/roles/sects-and-violets/Icon_cerenovus.png',
  'Pit-Hag':        'assets/roles/sects-and-violets/Icon_pithag.png',
  'Fang Gu':        'assets/roles/sects-and-violets/Icon_fanggu.png',
  'Vigormortis':    'assets/roles/sects-and-violets/Icon_vigormortis.png',
  'No Dashii':      'assets/roles/sects-and-violets/Icon_nodashii.png',
  'Vortox':         'assets/roles/sects-and-violets/Icon_vortox.png',
  ...EXPERIMENTAL_ICON_DEFAULTS,
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

const ROLE_NIGHT_INDEX = {
  'Apprentice': { firstNight: 1, otherNight: 0 },
  'Assassin': { firstNight: 0, otherNight: 36 },
  'Barber': { firstNight: 0, otherNight: 40 },
  'Barista': { firstNight: 1, otherNight: 1 },
  'Bone Collector': { firstNight: 0, otherNight: 1 },
  'Bureaucrat': { firstNight: 1, otherNight: 1 },
  'Butler': { firstNight: 39, otherNight: 67 },
  'Cerenovus': { firstNight: 25, otherNight: 15 },
  'Chambermaid': { firstNight: 51, otherNight: 70 },
  'Chef': { firstNight: 36, otherNight: 0 },
  'Clockmaker': { firstNight: 41, otherNight: 0 },
  'Courtier': { firstNight: 19, otherNight: 8 },
  'Devil\'s Advocate': { firstNight: 22, otherNight: 13 },
  'Dreamer': { firstNight: 42, otherNight: 56 },
  'Empath': { firstNight: 37, otherNight: 53 },
  'Evil Twin': { firstNight: 23, otherNight: 0 },
  'Exorcist': { firstNight: 0, otherNight: 21 },
  'Fang Gu': { firstNight: 0, otherNight: 29 },
  'Flowergirl': { firstNight: 0, otherNight: 57 },
  'Fortune Teller': { firstNight: 38, otherNight: 54 },
  'Gambler': { firstNight: 0, otherNight: 10 },
  'Godfather': { firstNight: 21, otherNight: 37 },
  'Gossip': { firstNight: 0, otherNight: 38 },
  'Grandmother': { firstNight: 40, otherNight: 51 },
  'Harlot': { firstNight: 0, otherNight: 1 },
  'Imp': { firstNight: 0, otherNight: 24 },
  'Innkeeper': { firstNight: 0, otherNight: 9 },
  'Investigator': { firstNight: 35, otherNight: 0 },
  'Juggler': { firstNight: 0, otherNight: 61 },
  'Librarian': { firstNight: 34, otherNight: 0 },
  'Lunatic': { firstNight: 8, otherNight: 20 },
  'Mathematician': { firstNight: 52, otherNight: 71 },
  'Monk': { firstNight: 0, otherNight: 12 },
  'Moonchild': { firstNight: 0, otherNight: 50 },
  'No Dashii': { firstNight: 0, otherNight: 30 },
  'Oracle': { firstNight: 0, otherNight: 59 },
  'Philosopher': { firstNight: 2, otherNight: 2 },
  'Pit-Hag': { firstNight: 0, otherNight: 16 },
  'Po': { firstNight: 0, otherNight: 28 },
  'Poisoner': { firstNight: 17, otherNight: 7 },
  'Professor': { firstNight: 0, otherNight: 43 },
  'Pukka': { firstNight: 28, otherNight: 26 },
  'Ravenkeeper': { firstNight: 0, otherNight: 52 },
  'Sage': { firstNight: 0, otherNight: 42 },
  'Sailor': { firstNight: 11, otherNight: 4 },
  'Scarlet Woman': { firstNight: 0, otherNight: 19 },
  'Seamstress': { firstNight: 43, otherNight: 60 },
  'Shabaloth': { firstNight: 0, otherNight: 27 },
  'Snake Charmer': { firstNight: 20, otherNight: 11 },
  'Spy': { firstNight: 49, otherNight: 68 },
  'Sweetheart': { firstNight: 0, otherNight: 41 },
  'Thief': { firstNight: 1, otherNight: 1 },
  'Tinker': { firstNight: 0, otherNight: 49 },
  'Town Crier': { firstNight: 0, otherNight: 58 },
  'Undertaker': { firstNight: 0, otherNight: 55 },
  'Vigormortis': { firstNight: 0, otherNight: 32 },
  'Vortox': { firstNight: 0, otherNight: 31 },
  'Washerwoman': { firstNight: 33, otherNight: 0 },
  'Witch': { firstNight: 24, otherNight: 14 },
  'Zombuul': { firstNight: 0, otherNight: 25 },
};

const FIRST_HINT_BY_NAME = new Map();
const OTHER_HINT_BY_NAME = new Map();

[NIGHT_ORDER, BMR_NIGHT_ORDER, SNV_NIGHT_ORDER].forEach(order => {
  (order.first || []).forEach(entry => {
    if (!FIRST_HINT_BY_NAME.has(entry.name)) FIRST_HINT_BY_NAME.set(entry.name, entry);
  });
  (order.other || []).forEach(entry => {
    if (!OTHER_HINT_BY_NAME.has(entry.name)) OTHER_HINT_BY_NAME.set(entry.name, entry);
  });
});

function buildCustomNightOrder(custom) {
  const selected = new Set(custom.roles || []);
  const selectedData = [...selected].map(name => ROLE_BY_NAME.get(name)).filter(Boolean);
  const hasMinion = selectedData.some(r => r.cat === 'minion');
  const hasDemon = selectedData.some(r => r.cat === 'demon');

  const first = [];
  const other = [];

  if (hasMinion) {
    first.push({
      order: 5,
      entry: {
        name: 'Minion info',
        st: true,
        minPlayers: 7,
        hint: 'If 7+ players: Minions learn each other and who the Demon is.',
      },
    });
  }
  if (hasDemon) {
    first.push({
      order: 8,
      entry: {
        name: 'Demon info',
        st: true,
        minPlayers: 7,
        hint: 'If 7+ players: Demon learns Minions and receives bluffs/setup info.',
      },
    });
  }

  selected.forEach(name => {
    const idx = ROLE_NIGHT_INDEX[name];
    if (idx?.firstNight > 0) {
      const meta = FIRST_HINT_BY_NAME.get(name);
      first.push({
        order: idx.firstNight,
        entry: {
          name,
          hint: meta?.hint || 'Acts on the first night.',
          cond: !!meta?.cond,
          st: !!meta?.st,
        },
      });
    }
  });

  selected.forEach(name => {
    const idx = ROLE_NIGHT_INDEX[name];
    if (idx?.otherNight > 0) {
      const meta = OTHER_HINT_BY_NAME.get(name);
      other.push({
        order: idx.otherNight,
        entry: {
          name,
          hint: meta?.hint || 'Acts on other nights.',
          cond: !!meta?.cond,
          st: !!meta?.st,
        },
      });
    }
  });

  first.sort((a, b) => a.order - b.order || a.entry.name.localeCompare(b.entry.name));
  other.sort((a, b) => a.order - b.order || a.entry.name.localeCompare(b.entry.name));

  return {
    first: first.map(x => x.entry),
    other: other.map(x => x.entry),
  };
}

export function getNightOrder(script = 'tb') {
  const id = normalizeScript(script);
  if (id === 'tb') return NIGHT_ORDER;
  if (id === 'bmr') return BMR_NIGHT_ORDER;
  if (id === 'snv') return SNV_NIGHT_ORDER;
  const custom = getCustomScript(id);
  if (custom) return buildCustomNightOrder(custom);
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
export const CAT_ORDER = ROLE_CATEGORY_ORDER;
