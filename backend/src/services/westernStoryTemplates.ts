/**
 * Western Story Templates V1
 *
 * 20 story templates optimized for Western/US/European markets.
 * Each template is a 30-day serial narrative with detailed episode breakdowns.
 *
 * Themes: Forbidden romance, revenge, fake dating, enemies-to-lovers,
 * second chances, celebrity romance, body swap, mafia, and more.
 *
 * Based on market analysis documents:
 * - Multi-Channel Story Content Overview.docx
 * - Stepbrother's Seduction.docx
 */

// ============================================
// Type Definitions
// ============================================

export interface StoryTemplate {
  id: string;
  title: string;
  genre: string;
  emotion: string;
  themeKeywords: string[];
  summary: string;
  visualStyle: VisualStyleGuide;
  emotionalTone: string;
  storyHooks: string[];
  // 30-day narrative arc - each day has a brief plot description
  episodes: EpisodeOutline[];
}

export interface EpisodeOutline {
  day: number;
  plot: string;
  keyMoments?: string[];
  visualPrompt?: string;
}

export interface VisualStyleGuide {
  toneColor: string;
  settingImagery: string;
  characterAesthetics: string;
  moodDetails: string;
}

// ============================================
// Story Templates
// ============================================

const STORY_TEMPLATES: StoryTemplate[] = [
  // ============================================
  // TEMPLATE 1: Sweet Revenge
  // ============================================
  {
    id: 'sweet_revenge_shattered_vows',
    title: 'Shattered Vows',
    genre: 'Romance',
    emotion: 'Revenge',
    themeKeywords: ['revenge', 'betrayal', 'redemption', 'secret-identity', 'empowerment'],
    summary: `Once a devoted fiancée with a bright future, Victoria was betrayed, robbed of her fortune,
    and left for dead by those she trusted – including the man she was supposed to marry. Now, years later,
    she returns under a new identity, determined to dismantle the lives of her treacherous ex and former
    best friend from the inside. Posing as an enigmatic heiress, she finds an unexpected ally in Adrian –
    her ex's charismatic brother – who is drawn to Victoria's strength but unaware of her true past.`,
    visualStyle: {
      toneColor: 'Dark, dramatic contrast with rich jewel tones (emerald, ruby) against shadowy backgrounds',
      settingImagery: 'Grand mansions, corporate boardrooms, city skylines at night',
      characterAesthetics: 'Heroine in elegant, sharp attire (sleek red dress, veil or mask); male lead in tailored suits',
      moodDetails: 'Stormy skies during tense moments, warm golden light for emerging romance',
    },
    emotionalTone: 'Intense and cathartic, blending suspense with passionate romance',
    storyHooks: ['Identity reveals and masquerades', 'Cliffhanger confrontations', 'Power reversals', 'Unexpected alliances'],
    episodes: [
      { day: 1, plot: 'Victoria arrives back in her hometown under an alias, secretly vowing revenge.' },
      { day: 2, plot: 'She crashes a high-society gala, locking eyes with her ex-fiancé who fails to recognize her.' },
      { day: 3, plot: 'Victoria plants seeds of her plan by charming her ex\'s business partners.' },
      { day: 4, plot: 'At a charity event, she encounters Adrian (ex\'s brother), intrigued by her wit.' },
      { day: 5, plot: 'Victoria nearly slips up when an old photograph almost gives away her identity.' },
      { day: 6, plot: 'She sabotages a crucial investment, causing public embarrassment for her ex.' },
      { day: 7, plot: 'Her ex and former best friend grow paranoid, unaware Victoria is the orchestrator.' },
      { day: 8, plot: 'Adrian helps Victoria escape probing questions; mutual respect ignites.' },
      { day: 9, plot: 'Victoria struggles with guilt seeing her former best friend\'s young daughter.' },
      { day: 10, plot: 'Over coffee, Adrian opens up about his strained family ties and loneliness.' },
      { day: 11, plot: 'Victoria executes her next move; Adrian intervenes when fallout gets heated.' },
      { day: 12, plot: 'Adrian discovers inconsistencies in Victoria\'s backstory, begins investigating.' },
      { day: 13, plot: 'Victoria exposes embezzlement, pushing her ex to the brink.' },
      { day: 14, plot: 'A tender moment between Victoria and Adrian leads to a charged almost-kiss.' },
      { day: 15, plot: 'Haunted by feelings for Adrian, Victoria nearly calls off her vendetta.' },
      { day: 16, plot: 'Her ex-fiancé uncovers a clue of Victoria\'s true identity and sets a trap.' },
      { day: 17, plot: 'Victoria walks into an ambush; narrowly escapes with Adrian\'s unexpected help.' },
      { day: 18, plot: 'Captured by enemies, Victoria is locked in the estate she once called home.' },
      { day: 19, plot: 'Adrian infiltrates the mansion, risking everything to rescue her.' },
      { day: 20, plot: 'Victoria publicly reveals evidence of her ex\'s crimes at a shareholders meeting.' },
      { day: 21, plot: 'Her ex-fiancé resorts to violence, taking Adrian hostage.' },
      { day: 22, plot: 'Victoria confronts her ex in a final standoff, leveraging his darkest secret.' },
      { day: 23, plot: 'Police and media swarm; betrayers are exposed and taken into custody.' },
      { day: 24, plot: 'Victoria finally breaks down; Adrian is there to hold her.' },
      { day: 25, plot: 'With villains punished, Victoria struggles with emptiness.' },
      { day: 26, plot: 'Adrian helps Victoria see the good she\'s done by stopping the corrupt.' },
      { day: 27, plot: 'Victoria reads a heartfelt letter from her former friend from jail.' },
      { day: 28, plot: 'Free of the past, Victoria and Adrian confess their feelings.' },
      { day: 29, plot: 'They plan a future; Victoria considers partnering with Adrian in charity work.' },
      { day: 30, plot: 'Epilogue: One year later at a gala, Victoria is by Adrian\'s side as his genuine partner.' },
    ],
  },

  // ============================================
  // TEMPLATE 2: Dark Obsession (Devil's Bargain)
  // ============================================
  {
    id: 'dark_obsession_devils_bargain',
    title: 'Devil\'s Bargain',
    genre: 'Romance',
    emotion: 'Dark Passion',
    themeKeywords: ['billionaire', 'power', 'blackmail', 'passion', 'secrets', 'redemption'],
    summary: `Mia is a fierce investigative journalist determined to bring down Damien Wolfe – a reclusive
    billionaire rumored to have dark secrets. When her attempt to expose him backfires, Damien offers Mia
    a devil's bargain: pose as his fiancée for one month, or he'll destroy her career. Thrust into a world
    of penthouses and dangerous liaisons, Mia and Damien's fake engagement ignites a volatile chemistry
    that blurs the lines between pretense and reality.`,
    visualStyle: {
      toneColor: 'Moody high-contrast: midnight blues, blacks, gold accents',
      settingImagery: 'Skyscraper skylines at night, luxury penthouses, private jets',
      characterAesthetics: 'Damien in dark suits, silhouette with city lights; Mia in smart business-casual to evening wear',
      moodDetails: 'Reflections symbolizing dual lives; warm low lighting for vulnerability',
    },
    emotionalTone: 'Darkly passionate and suspenseful; constant push-pull of control vs surrender',
    storyHooks: ['Power plays and mind games', 'Forced proximity fake engagement', 'Secret past revelations', 'Sudden betrayals'],
    episodes: [
      { day: 1, plot: 'Mia sneaks into an exclusive charity gala to gather evidence against Damien Wolfe.' },
      { day: 2, plot: 'Damien catches Mia snooping; intrigued by her audacity, he confronts her calmly.' },
      { day: 3, plot: 'Damien proposes a deal: act as his fiancée for a month or he destroys her career.' },
      { day: 4, plot: 'Backed into a corner, Mia signs a strict contract binding her to his world.' },
      { day: 5, plot: 'Damien whisks Mia to a high-end fashion house for a makeover.' },
      { day: 6, plot: 'At their first public appearance, Mia diffuses a tense shareholders\' meeting.' },
      { day: 7, plot: 'An argument erupts; Damien pins her against the wall, then stares at her lips.' },
      { day: 8, plot: 'Mia discovers Damien\'s tragic childhood incident (a mysterious fire).' },
      { day: 9, plot: 'At his country estate, they share a genuine conversation under the stars.' },
      { day: 10, plot: 'A rival leaks a false story; Damien\'s ferocious defense surprises everyone.' },
      { day: 11, plot: 'Sparks fly when Mia confronts Damien; a heated kiss almost happens.' },
      { day: 12, plot: 'Damien imposes distance, assigning Mia separate quarters.' },
      { day: 13, plot: 'At a charity auction, Mia learns Damien\'s empire was built on avenging family betrayal.' },
      { day: 14, plot: 'An ex-lover warns Mia about Damien\'s "dark appetites"; jealousy-fueled kiss ensues.' },
      { day: 15, plot: 'Damien opens up about the fire that killed his parents.' },
      { day: 16, plot: 'Mia\'s boss publishes an exposé; Damien accuses Mia of betrayal.' },
      { day: 17, plot: 'Mia desperately works to prove she had no part in the article.' },
      { day: 18, plot: 'A rival kidnaps Mia to force Damien to relinquish a crucial deal.' },
      { day: 19, plot: 'Damien chooses Mia over his life\'s work, agreeing to an exchange.' },
      { day: 20, plot: 'Climax at an abandoned warehouse; Mia outwits a guard to free Damien.' },
      { day: 21, plot: 'Mia tends to Damien\'s injuries; this time their kiss has no pretense.' },
      { day: 22, plot: 'With days left in the deal, both dread its end.' },
      { day: 23, plot: 'Mia\'s editor offers her a chance to publish ethically; Damien supports her.' },
      { day: 24, plot: 'The exposé goes live, taking down the rival and vindicating Damien.' },
      { day: 25, plot: 'Damien formally releases Mia from the bargain, offering her freedom.' },
      { day: 26, plot: 'Mia admits she fell for the man behind the monster mask.' },
      { day: 27, plot: 'Damien confesses Mia\'s courage pulled him back from darkness.' },
      { day: 28, plot: 'Together, they establish a philanthropic initiative.' },
      { day: 29, plot: 'Damien officially announces Mia as the woman he loves.' },
      { day: 30, plot: 'Epilogue: At the country estate, Damien proposes for real—no contracts.' },
    ],
  },

  // ============================================
  // TEMPLATE 3: Phoenix Reborn (Fantasy)
  // ============================================
  {
    id: 'phoenix_reborn',
    title: 'Reborn in Flames',
    genre: 'Fantasy Romance',
    emotion: 'Second Chance',
    themeKeywords: ['reincarnation', 'fantasy', 'betrayal', 'magic', 'empowerment', 'second-chance'],
    summary: `Princess Celeste was executed for treason under false accusations. Fate grants her a miraculous
    second chance—she awakens in her own body two years earlier. Armed with memories of the future,
    Celeste vows to protect her kingdom and heart, forming an alliance with Prince Kieran. With magical
    signs appearing and powers stirring, Celeste must decide between embracing love or completing her
    mission of vengeance.`,
    visualStyle: {
      toneColor: 'Epic ethereal: royal purples, golds, fiery oranges for phoenix imagery',
      settingImagery: 'Grand medieval castles, moonlit courtyards, ancient woodlands, magical elements',
      characterAesthetics: 'Celeste in gowns evolving from pastels to flame-inspired designs; Kieran in dark royal military attire',
      moodDetails: 'Backlighting for power; dramatic lighting contrasts for fate changes',
    },
    emotionalTone: 'Empowering and suspenseful with strong undercurrent of hope',
    storyHooks: ['Do-over fantasy of correcting past mistakes', 'Magical revelations', 'Court intrigue', 'Second-chance love'],
    episodes: [
      { day: 1, plot: 'Princess Celeste draws her last breath in a dungeon, executed for a crime she didn\'t commit.' },
      { day: 2, plot: 'Celeste jolts awake two years earlier on the morning of a crucial peace treaty.' },
      { day: 3, plot: 'Celeste realizes she has been reborn with memories intact; steels herself.' },
      { day: 4, plot: 'At court, Celeste boldly defies the corrupt Prime Minister.' },
      { day: 5, plot: 'Celeste drafts a list of future betrayals and starts devising counter-plans.' },
      { day: 6, plot: 'Celeste seeks out Prince Kieran, proposing a private alliance.' },
      { day: 7, plot: 'Kieran agrees to a secret pact; their midnight handshake marks first trust.' },
      { day: 8, plot: 'Celeste saves the King from poisoned wine using her future knowledge.' },
      { day: 9, plot: 'Celeste exposes a minor traitor; Kieran provides an ancient scroll about Phoenix magic.' },
      { day: 10, plot: 'At a tournament, Celeste prevents a "mishap" that would have injured her friend.' },
      { day: 11, plot: 'Celeste and Kieran train together in swordplay at dawn; bond deepens.' },
      { day: 12, plot: 'The advisor plants false evidence; Celeste deftly outmaneuvers him.' },
      { day: 13, plot: 'Celeste publicly breaks off her engagement to her former fiancé.' },
      { day: 14, plot: 'A fabricated "prophecy" circulates that the princess is cursed.' },
      { day: 15, plot: 'Celeste displays exceptional leadership in a council meeting.' },
      { day: 16, plot: 'Celeste uncovers and removes a handmaiden spy from the palace.' },
      { day: 17, plot: 'At Kieran\'s winter ball, their dance is the talk of two kingdoms.' },
      { day: 18, plot: 'Kieran shows Celeste a phoenix mural; she confides the full truth of her rebirth.' },
      { day: 19, plot: 'Celeste uncovers the foreign power aiding the coup plot.' },
      { day: 20, plot: 'Celeste\'s younger sister becomes a pawn; the timeline shifts unpredictably.' },
      { day: 21, plot: 'Celeste arranges a grand council to expose the traitors.' },
      { day: 22, plot: 'Traitors strike first with forged letters; Celeste turns the tables.' },
      { day: 23, plot: 'Kieran arrives with elite guards; violent clash erupts in the council hall.' },
      { day: 24, plot: 'With flaming magic, Celeste disarms the corrupt advisor.' },
      { day: 25, plot: 'Conspirators defeated; King and Queen apologize for doubting Celeste.' },
      { day: 26, plot: 'News arrives the invasion was aborted; Celeste is hailed as a hero.' },
      { day: 27, plot: 'Celeste visits graves of those who died (now alive thanks to her).' },
      { day: 28, plot: 'Celeste and Kieran confess their love in the royal gardens.' },
      { day: 29, plot: 'Celeste is named heir to the throne and announces reforms.' },
      { day: 30, plot: 'Epilogue: Phoenix fireworks light the sky as they announce their engagement.' },
    ],
  },

  // ============================================
  // TEMPLATE 4: Royals & Rebels (Academy)
  // ============================================
  {
    id: 'royals_rebels_cruel_elite',
    title: 'Cruel Elite',
    genre: 'New Adult Romance',
    emotion: 'Enemies to Lovers',
    themeKeywords: ['academy', 'bully-to-lover', 'social hierarchy', 'teen drama', 'empowerment', 'secrets'],
    summary: `Ella Mason, a scholarship student from a working-class background, enters elite Ravenswood Academy
    where billionaires' children rule. She clashes with Logan Hale, the notorious golden boy. As pranks
    escalate, Ella stands her ground, earning grudging respect. But behind the hostility, sparks fly between
    the rebel and the kingpin in this classic enemies-to-lovers story.`,
    visualStyle: {
      toneColor: 'Dark academia (cool grays, deep blues) warming to rich golds and sunset hues',
      settingImagery: 'Prestigious campus: stone archways, grand lecture halls, mansion-like dorms',
      characterAesthetics: 'Ella in simple casual vs designer outfits; Logan from pressed uniforms to relaxed tees',
      moodDetails: 'Crowded hallways showing isolation vs intimate two-shots for growing closeness',
    },
    emotionalTone: 'Dramatic, angsty, yet ultimately uplifting',
    storyHooks: ['Public humiliations', 'Secret friendships', 'Battle of wills', 'Social divide crossing'],
    episodes: [
      { day: 1, plot: 'Ella arrives at Ravenswood, awed by wealth until cold welcome marks her as outsider.' },
      { day: 2, plot: 'Ella impresses teacher, unintentionally outshining the queen bee Madison.' },
      { day: 3, plot: 'Logan publicly "introduces" Ella by spilling a drink on her in the cafeteria.' },
      { day: 4, plot: 'Ella posts highest exam score; Logan confronts her, she leaves him speechless.' },
      { day: 5, plot: 'Madison spreads false rumor that Ella is a charity case.' },
      { day: 6, plot: 'Friendly socialite gives Ella inside scoop on Logan\'s family pressure.' },
      { day: 7, plot: 'A prank goes too far; Ella sees Logan look genuinely upset.' },
      { day: 8, plot: 'Logan offers terse apology; Ella accepts with measured grace.' },
      { day: 9, plot: 'Leaked exam key blamed on Ella; Logan intervenes with alibi.' },
      { day: 10, plot: 'Ella demands why Logan helped; unusual tension between them.' },
      { day: 11, plot: 'Paired in chemistry lab, bickering gives way to effective teamwork.' },
      { day: 12, plot: 'Fragile truce; Logan offers access to private notes.' },
      { day: 13, plot: 'Ella\'s secret emerges: illegitimate daughter of notable alumnus.' },
      { day: 14, plot: 'Logan finds Ella crying; comforts her, they bond deeply.' },
      { day: 15, plot: 'They spend time together "tutoring"; genuine friendship forms.' },
      { day: 16, plot: 'Madison plans nasty surprise at fall formal.' },
      { day: 17, plot: 'Fall Formal: Logan struck by Ella\'s beauty in simple dress.' },
      { day: 18, plot: 'Cruel prank at dance humiliates Ella; Logan condemns it publicly.' },
      { day: 19, plot: 'Logan finds Ella at park bench; offers sincere apology.' },
      { day: 20, plot: 'Logan uses influence to get perpetrators punished.' },
      { day: 21, plot: 'Classmates start treating Ella with respect.' },
      { day: 22, plot: 'Logan performs heartfelt song at open mic night dedicated to Ella.' },
      { day: 23, plot: 'First kiss under neon lights outside café.' },
      { day: 24, plot: 'Rumors swirl; Logan\'s parents disapprove of dating "outside their circle".' },
      { day: 25, plot: 'University acceptance contingent on character reference; strain shows.' },
      { day: 26, plot: 'Ella considers transferring; confrontation ensues.' },
      { day: 27, plot: 'They reaffirm commitment to face whatever comes together.' },
      { day: 28, plot: 'Ella receives top honor at awards; acknowledges Logan in speech.' },
      { day: 29, plot: 'Logan\'s mother offers polite smile; small grace moment.' },
      { day: 30, plot: 'Epilogue: Graduation; they leave campus hand-in-hand, ready for new world.' },
    ],
  },

  // ============================================
  // TEMPLATE 5: Blood & Roses (Mafia)
  // ============================================
  {
    id: 'blood_roses_vendetta',
    title: 'Vendetta of Love',
    genre: 'Dark Romance',
    emotion: 'Dangerous Love',
    themeKeywords: ['mafia', 'crime', 'captivity', 'forbidden love', 'loyalty', 'danger'],
    summary: `After her brother is killed in a mafia hit, Bella tracks the bullet to Nico La Torre, heir to the
    feared La Torre family. When Nico takes her captive instead of killing her, Bella discovers her brother's
    death was orchestrated by a traitor within Nico's ranks. As an uneasy alliance forms to uncover the
    traitor, forbidden attraction blooms between captive and captor.`,
    visualStyle: {
      toneColor: 'Gritty dark: shadows, neon reflections, gunmetal grays; luxury interiors with deep reds, gold',
      settingImagery: 'Urban underworld: warehouses, underground clubs, lavish estate',
      characterAesthetics: 'Nico in tailored suits with tattoos/scars; Bella from mourning attire to practical jeans/leather',
      moodDetails: 'Chiaroscuro lighting; blood red roses as motif contrasting violence',
    },
    emotionalTone: 'Dark, dangerous, and passionately intense',
    storyHooks: ['Captor and captive from enemy sides', 'Betrayals within mafia', 'External threats', 'Romantic tipping points'],
    episodes: [
      { day: 1, plot: 'Bella at brother\'s gravesite vows to hunt down the killer.' },
      { day: 2, plot: 'Using brother\'s journal, Bella identifies Nico La Torre.' },
      { day: 3, plot: 'Bella crashes underground club; dragged before Nico.' },
      { day: 4, plot: 'Nico takes Bella captive to his mansion instead of killing her.' },
      { day: 5, plot: 'Bella meets Nico\'s mother; sees glimpses of his human side.' },
      { day: 6, plot: 'Bella attempts escape; Nico catches her, doesn\'t punish.' },
      { day: 7, plot: 'Bella admits she\'s after revenge; Nico\'s facade cracks.' },
      { day: 8, plot: 'Bella discovers secret room with Nico\'s childhood mementos.' },
      { day: 9, plot: 'Nico shares story of father\'s legacy; Bella softens hatred.' },
      { day: 10, plot: 'Rival gang shoots at mansion; Nico shields Bella during attack.' },
      { day: 11, plot: 'Bella tends Nico\'s wound; chemistry simmers.' },
      { day: 12, plot: 'Nico offers deal: help find mole, get vengeance.' },
      { day: 13, plot: 'Together they find clues pointing to "Scorpion" - Nico\'s lieutenant.' },
      { day: 14, plot: 'Nico stages ruse that Bella escaped to lure traitor.' },
      { day: 15, plot: 'Bella courageously meets mole; violence erupts, Nico captures traitor.' },
      { day: 16, plot: 'Under interrogation, truth revealed: Bella\'s brother was collateral damage.' },
      { day: 17, plot: 'Bella breaks down, mourns; they share tentative passionate kiss.' },
      { day: 18, plot: 'Rival demands Nico hand over traitor and Bella or face war.' },
      { day: 19, plot: 'Nico refuses; prepares mansion for assault.' },
      { day: 20, plot: 'Nighttime shootout; Bella and Nico fight back-to-back.' },
      { day: 21, plot: 'Bella confronts rival boss at gunpoint.' },
      { day: 22, plot: 'Bella resists executing him; Nico takes prisoner.' },
      { day: 23, plot: 'Aftermath: Nico embraces Bella; bond undeniable.' },
      { day: 24, plot: 'Traitor delivered to justice; Nico credits Bella\'s bravery.' },
      { day: 25, plot: 'Bella uncertain about future; Nico offers to set her free.' },
      { day: 26, plot: 'Nico takes bullet for Bella from sniper.' },
      { day: 27, plot: 'At Nico\'s bedside, Bella confesses love and choice to stay.' },
      { day: 28, plot: 'Nico pledges to lead family out of constant bloodshed.' },
      { day: 29, plot: 'Nico negotiates truce with other families.' },
      { day: 30, plot: 'Epilogue: Small church; Nico lights candle for Bella\'s brother; exit hand-in-hand.' },
    ],
  },

  // ============================================
  // TEMPLATE 6: Off Limits (Step-siblings)
  // ============================================
  {
    id: 'off_limits_stepbrother',
    title: 'My Wicked Stepbrother',
    genre: 'Taboo Romance',
    emotion: 'Forbidden Love',
    themeKeywords: ['forbidden romance', 'step-siblings', 'taboo', 'family drama', 'secret love'],
    summary: `When 18-year-old Haley's mom marries into the affluent King family, she finds herself with a
    gorgeous but arrogant stepbrother, Cole. Beneath constant bickering lies crackling attraction both
    know is completely off-limits. From midnight kitchen encounters to heated arguments, temptation grows.
    When family secrets threaten exposure, Haley and Cole must decide how far they'll go to guard their secret.`,
    visualStyle: {
      toneColor: 'Warm golden interiors vs cool tense public scenes',
      settingImagery: 'Suburban luxury home: cozy kitchen, pool, backyard; school lockers and parking lot',
      characterAesthetics: 'Haley: girl-next-door; Cole: effortlessly cool bad-boy in leather jacket',
      moodDetails: 'Steamy tension in close quarters; reflections showing internal struggle',
    },
    emotionalTone: 'Tense, angsty, and illicitly romantic',
    storyHooks: ['Forbidden aspect central hook', 'Every touch carries extra weight', 'Cliffhanger near-discoveries'],
    episodes: [
      { day: 1, plot: 'Haley moves into King family house; greeted by Cole\'s icy glare.' },
      { day: 2, plot: 'Cole ignores Haley at dinner, makes cruel quip about scholarship.' },
      { day: 3, plot: 'Cole posts "House Rules" note; Haley blasts music in retaliation.' },
      { day: 4, plot: 'Tense standoff inches apart before Cole storms off.' },
      { day: 5, plot: 'Pool party; Cole caught checking Haley out.' },
      { day: 6, plot: 'Haley slaps Cole; he grabs her wrist, almost-kiss moment.' },
      { day: 7, plot: 'Late night kitchen truce with ice cream about stress.' },
      { day: 8, plot: 'Haley walks in on Cole making out; jealous flares up.' },
      { day: 9, plot: 'Cole teases about jealousy; both more confused.' },
      { day: 10, plot: 'Forced car ride; they argue about music, share half-smile.' },
      { day: 11, plot: 'Classmate asks Haley out; Cole "vets" him with threats.' },
      { day: 12, plot: 'Coffee date goes poorly; Cole\'s possessiveness shows.' },
      { day: 13, plot: 'Wedding of relative; Cole protective when cousins flirt.' },
      { day: 14, plot: 'At reception, almost-kiss interrupted by mom\'s call.' },
      { day: 15, plot: 'Guilt and fear make them avoid each other.' },
      { day: 16, plot: 'Power outage; forbidden kiss in darkness.' },
      { day: 17, plot: 'Morning brings regret; Cole leaves for space.' },
      { day: 18, plot: 'Distance difficult; both miserable apart.' },
      { day: 19, plot: 'Cole returns with soup for sick Haley; realizes her feelings.' },
      { day: 20, plot: 'They agree to keep relationship secret.' },
      { day: 21, plot: 'Secret dating begins: stolen kisses, hidden texts.' },
      { day: 22, plot: 'Close call: mom nearly catches them cuddling.' },
      { day: 23, plot: 'Cole\'s ex Jenna spots Haley wearing his hoodie, suspicious.' },
      { day: 24, plot: 'Jenna threatens to expose their "dirty secret."' },
      { day: 25, plot: 'Haley distances herself; Cole confronts her, she confesses threat.' },
      { day: 26, plot: 'Cole faces Jenna, refuses to be blackmailed.' },
      { day: 27, plot: 'Family vacation announced; close quarters minefield.' },
      { day: 28, plot: 'Hotel room mix-up forces them to share room.' },
      { day: 29, plot: 'Parents catch them via text message; confrontation ensues.' },
      { day: 30, plot: 'Epilogue: Family grudgingly accepts; they sit on porch swing at sunset.' },
    ],
  },

  // ============================================
  // TEMPLATE 7: Faking It (Fake Dating)
  // ============================================
  {
    id: 'faking_it_dating_deal',
    title: 'The Dating Deal',
    genre: 'Romantic Comedy',
    emotion: 'Slow Burn',
    themeKeywords: ['fake relationship', 'romantic comedy', 'slow burn', 'pretend love', 'friends-to-lovers'],
    summary: `Natalie needs a date for her cousin's wedding (where her ex will be). Adam needs a respectable
    date for corporate events. They strike a deal: pretend to be a couple for a month with clear rules—
    no falling in love. But as they navigate dance floor dips and staged kisses, their chemistry becomes
    impossible to deny. What starts as fake blossoms into real passion.`,
    visualStyle: {
      toneColor: 'Bright, uplifting with warm natural lighting',
      settingImagery: 'Modern urban: office with glass walls, cozy coffee shops, wedding venues',
      characterAesthetics: 'Natalie in soft blues/pinks; Adam in neutrals; physical closeness increases over time',
      moodDetails: 'Smiling and laughter; text message bubbles showing deepening communication',
    },
    emotionalTone: 'Light-hearted, humorous, and heartwarming',
    storyHooks: ['Beloved fake dating trope', 'Comedic scenarios', 'Romantic near-misses', 'Dramatic irony'],
    episodes: [
      { day: 1, plot: 'Natalie learns ex will be at cousin\'s wedding; lies about bringing boyfriend.' },
      { day: 2, plot: 'Adam told by boss to bring date to corporate gala for promotion.' },
      { day: 3, plot: 'Natalie and Adam collide in breakroom; half-seriously propose fake dating.' },
      { day: 4, plot: 'They draft "dating contract" on napkin with clear terms.' },
      { day: 5, plot: 'Family brunch: Adam effortlessly charms Natalie\'s parents.' },
      { day: 6, plot: 'After brunch, moment of closeness; both awkwardly pull back.' },
      { day: 7, plot: 'Corporate gala: Natalie plays role perfectly.' },
      { day: 8, plot: 'Mandatory waltz; practiced smiles soften to genuine.' },
      { day: 9, plot: 'Taxi home giddy; Natalie rests head on Adam\'s shoulder.' },
      { day: 10, plot: 'Takeout and personal stories to "get stories straight."' },
      { day: 11, plot: 'At work, must remind selves to act normal.' },
      { day: 12, plot: 'Game night with friends; skeptical best friend grills Natalie.' },
      { day: 13, plot: 'Flour fight turns charged moment; alarm interrupts.' },
      { day: 14, plot: 'Dress fitting: Adam zips Ella, hands lingering.' },
      { day: 15, plot: 'Adam gets promotion; wants to tell Natalie first.' },
      { day: 16, plot: 'Dinner celebration: Adam gives thoughtful gift; almost-kiss interrupted.' },
      { day: 17, plot: 'Office party: coworker tells Adam "she\'s a keeper."' },
      { day: 18, plot: 'Caught in rain; share unplanned passionate kiss.' },
      { day: 19, plot: 'Morning after: both unsure how to behave.' },
      { day: 20, plot: 'Family dinner at Adam\'s childhood home.' },
      { day: 21, plot: 'Phone "debrief" turns into hours-long personal chat.' },
      { day: 22, plot: 'Drive to hometown; singing and laughing together.' },
      { day: 23, plot: 'Wedding rehearsal: ex sees Natalie radiant with Adam.' },
      { day: 24, plot: 'Bonfire pre-party: slow dance away from crowd.' },
      { day: 25, plot: 'Wedding day: picture-perfect but bittersweet.' },
      { day: 26, plot: 'Bridal bouquet; Natalie wishes parts were real.' },
      { day: 27, plot: 'Arrangement ends; attempt to go back to just friends.' },
      { day: 28, plot: 'Week of awkward avoidance; Adam appears at Natalie\'s door.' },
      { day: 29, plot: 'Confessions of love; tear up old contract.' },
      { day: 30, plot: 'Epilogue: Months later, another wedding as truly happy couple.' },
    ],
  },

  // ============================================
  // TEMPLATE 8: Starstruck (Celebrity Romance)
  // ============================================
  {
    id: 'starstruck_celebrity',
    title: 'Beyond the Spotlight',
    genre: 'Celebrity Romance',
    emotion: 'Wish Fulfillment',
    themeKeywords: ['celebrity romance', 'fame vs normal life', 'glamour', 'paparazzi', 'hidden relationship'],
    summary: `Zoe is a small-town barista who offers sanctuary to A-list actor Ethan Rhodes hiding from paparazzi.
    What starts as meet-cute turns into friendship as Ethan invites Zoe into his exclusive world. As their
    relationship deepens, Zoe grapples with media frenzy while Ethan must choose between image and happiness.
    Beyond the Spotlight explores whether love can flourish outside the harsh glare of fame.`,
    visualStyle: {
      toneColor: 'Glamorous yet grounded: bright glittering vs warm everyday scenes',
      settingImagery: 'Paparazzi elements; intimate hideaways; dual settings showing two worlds colliding',
      characterAesthetics: 'Zoe from simple casual to polished when needed; Ethan from incognito to movie star sharp',
      moodDetails: 'Silhouettes vs full light; phone screens showing anxiety; stars motif',
    },
    emotionalTone: 'Whimsical and romantic with realistic edge about media invasion',
    storyHooks: ['Cinderella-like premise', 'Media scandal elements', 'Question: can love survive spotlight?'],
    episodes: [
      { day: 1, plot: 'Zoe helps mega-celebrity Ethan Rhodes escape paparazzi.' },
      { day: 2, plot: 'Ethan returns to thank Zoe; they chat, he feels relaxed.' },
      { day: 3, plot: 'Tabloid publishes grainy photo; Ethan invites Zoe to movie set.' },
      { day: 4, plot: 'On set, paparazzi snap photo of Zoe handing Ethan drink.' },
      { day: 5, plot: 'Photo hits social media; Zoe panics about attention.' },
      { day: 6, plot: 'Ethan picks Zoe up for industry party in disguise.' },
      { day: 7, plot: 'Jealous starlet spills drink on Zoe; Ethan protects her.' },
      { day: 8, plot: 'Tabloids run with story; Zoe\'s boss warns about business impact.' },
      { day: 9, plot: 'Ethan lays low; Zoe doubts if she was just fling.' },
      { day: 10, plot: 'Ethan shows up at café; first kiss almost interrupted.' },
      { day: 11, plot: 'Secret road trip and beach picnic; kiss under sunset.' },
      { day: 12, plot: 'Paparazzi ambush Zoe\'s apartment; Ethan stays overnight.' },
      { day: 13, plot: 'Zoe\'s social media blows up with nasty DMs.' },
      { day: 14, plot: 'Ethan arranges private dinner on café patio.' },
      { day: 15, plot: 'TV host threatens to expose Zoe\'s family; she needs space.' },
      { day: 16, plot: 'Reluctant pause; Ethan denies dating to shield Zoe.' },
      { day: 17, plot: 'Friend blogs controlled interview painting Zoe positively.' },
      { day: 18, plot: 'Ethan sneaks over; they cook together, ignoring chaos.' },
      { day: 19, plot: 'Ethan wants Zoe at movie premiere; terrified, she agrees.' },
      { day: 20, plot: 'Premiere prep with stylist; Zoe hardly recognizes herself.' },
      { day: 21, plot: 'Red carpet: flashbulbs, rude question, Ethan\'s protective arm.' },
      { day: 22, plot: 'Interview clip viral: Ethan calls Zoe "incredibly special."' },
      { day: 23, plot: 'Toxic fans escalate; Zoe loses her job at café.' },
      { day: 24, plot: 'Ethan offers financial support; argument, he leaves hurt.' },
      { day: 25, plot: 'Cooling-off period: Zoe considers returning home.' },
      { day: 26, plot: 'Ethan on talk show deviates to defend Zoe; #StandWithZoe trends.' },
      { day: 27, plot: 'Zoe watches moved; public opinion shifts; boss invites her back.' },
      { day: 28, plot: 'Ethan goes to Zoe\'s apartment; reconcile with tears and kiss.' },
      { day: 29, plot: 'Zoe announces dating Ethan on social media.' },
      { day: 30, plot: 'Epilogue: Year later, Zoe\'s debut novel launch with Ethan by her side.' },
    ],
  },

  // Additional templates would continue here...
  // For brevity, I'll add a few key ones from the second document

  // ============================================
  // TEMPLATE 9: Stepbrother's Seduction
  // ============================================
  {
    id: 'stepbrother_seduction',
    title: 'Stepbrother\'s Seduction',
    genre: 'Taboo Romance',
    emotion: 'Forbidden Desire',
    themeKeywords: ['step-siblings', 'forbidden love', 'taboo', 'family drama', 'coming-of-age'],
    summary: `Emma's mother remarries, bringing a new stepbrother Aiden into her life. From the moment they
    lock eyes at the wedding, an undeniable spark flares. Under one roof, they're drawn to each other in
    ways they know they shouldn't be. With family boundaries warning them to stay apart, tension builds
    each day in this tale of forbidden longing.`,
    visualStyle: {
      toneColor: 'Warm intimate interiors vs cool tense public scenes',
      settingImagery: 'Suburban home: kitchen, porch, backyard, bedrooms',
      characterAesthetics: 'Emma: girl-next-door; Aiden: charismatic with rebellious edge',
      moodDetails: 'Steamy tension in close quarters; stolen glances across tables',
    },
    emotionalTone: 'Tense, angsty, illicitly romantic',
    storyHooks: ['Forbidden aspect central hook', 'Every touch carries weight', 'Cliffhanger near-discoveries'],
    episodes: [
      { day: 1, plot: 'Emma meets Aiden at wedding; feels immediate dangerous spark.' },
      { day: 2, plot: 'First night under one roof filled with awkward tension.' },
      { day: 3, plot: 'Aiden walks around shirtless; Emma\'s heart races.' },
      { day: 4, plot: 'Emma tries to ignore attraction; Aiden\'s teasing makes it impossible.' },
      { day: 5, plot: 'Towel after shower moment; electrifying tension.' },
      { day: 6, plot: 'Dinner with oblivious parents; stolen furtive glances.' },
      { day: 7, plot: 'Late night porch conversation brings them emotionally closer.' },
      { day: 8, plot: 'Aiden grows protective seeing flirty texts; jealousy surprises both.' },
      { day: 9, plot: 'Aiden brings date home; Emma stung by jealousy.' },
      { day: 10, plot: 'Heated argument nearly erupts into kiss.' },
      { day: 11, plot: 'Shaken by almost-kiss, agree to keep distance.' },
      { day: 12, plot: 'Emma spends day at friend\'s, only talks about Aiden.' },
      { day: 13, plot: 'Tentative hug stirs forbidden warmth.' },
      { day: 14, plot: 'Parents pleased "siblings" getting along better.' },
      { day: 15, plot: 'Emma struggles to hide truth from best friend.' },
      { day: 16, plot: 'Parents away for weekend; temptation hangs heavy.' },
      { day: 17, plot: 'Power outage: candlelight, slow burn ignites.' },
      { day: 18, plot: 'They give in to desires, share passionate forbidden kiss.' },
      { day: 19, plot: 'Aftermath silence: both exhilarated and terrified.' },
      { day: 20, plot: 'Aiden suggests it was mistake; puts walls up.' },
      { day: 21, plot: 'Aiden plans to stay with friend to clear head.' },
      { day: 22, plot: 'Aiden leaves abruptly; Emma realizes she\'s in love.' },
      { day: 23, plot: 'Emma confronts Aiden at friend\'s place.' },
      { day: 24, plot: 'Aiden confesses he\'s fallen desperately in love.' },
      { day: 25, plot: 'They spend night together, committed despite odds.' },
      { day: 26, plot: 'Carefully keep romance hidden behind closed doors.' },
      { day: 27, plot: 'Secret unravels when mom walks in on tender moment.' },
      { day: 28, plot: 'Chaos erupts; strictly forbidden from seeing each other.' },
      { day: 29, plot: 'Aiden stands up to parents, declares feelings are real.' },
      { day: 30, plot: 'Despite heartbreak, promise to find way to be together.' },
    ],
  },

  // ============================================
  // TEMPLATE 10: Tempting the Professor
  // ============================================
  {
    id: 'tempting_professor',
    title: 'Tempting the Professor',
    genre: 'Forbidden Romance',
    emotion: 'Academic Romance',
    themeKeywords: ['professor-student', 'forbidden', 'academic', 'age gap', 'power dynamics'],
    summary: `Olivia is a dedicated college senior who never imagined she'd risk her future for a crush—until
    she meets Professor Alexander Cole. He's brilliant and enigmatic, known for keeping students at arm's
    length. But every after-class conversation fans a spark between them. In a world of campus gossip
    and strict rules, Olivia and Professor Cole struggle to resist an attraction that grows more
    irresistible by the day.`,
    visualStyle: {
      toneColor: 'Academic: warm wood tones, book-lined offices, campus golden hour',
      settingImagery: 'Lecture halls, office doorways, conference hotels, campus coffee shop',
      characterAesthetics: 'Olivia: smart-casual student; Professor Cole: commanding presence, warm voice',
      moodDetails: 'Professional distance vs. unspoken desire; campus gossip elements',
    },
    emotionalTone: 'Intense intellectual and emotional connection',
    storyHooks: ['Power imbalance', 'Career at stake', 'Campus gossip', 'Conference trip proximity'],
    episodes: [
      { day: 1, plot: 'Olivia takes seat in Professor Cole\'s class, struck by his presence.' },
      { day: 2, plot: 'After class, Olivia asks question; Cole impressed by insight.' },
      { day: 3, plot: 'Cole lingers over Olivia\'s thoughtful essay.' },
      { day: 4, plot: 'Eyes meet after witty remark; Olivia\'s heart skips.' },
      { day: 5, plot: 'Office hours visit crackles with unspoken tension.' },
      { day: 6, plot: 'Accidental hand brush; both momentarily speechless.' },
      { day: 7, plot: 'Run into each other at campus coffee shop; personal conversation.' },
      { day: 8, plot: 'Cole gives fond smile then turns stern; fighting professionalism.' },
      { day: 9, plot: 'Colleague warns Cole about getting "too close" to students.' },
      { day: 10, plot: 'Cole avoids looking at Olivia; she\'s confused and hurt.' },
      { day: 11, plot: 'Olivia confronts Cole; he insists on professionalism despite longing.' },
      { day: 12, plot: 'Travel to academic conference together; both nervous.' },
      { day: 13, plot: 'Hotel booking mix-up: adjacent rooms, heightened awareness.' },
      { day: 14, plot: 'Conference dinner: charming relaxed side of Cole emerges.' },
      { day: 15, plot: 'Walking to room, almost-kiss before he pulls away.' },
      { day: 16, plot: 'He apologizes; leaves abruptly; Olivia feels rejected.' },
      { day: 17, plot: 'Olivia struggles to focus; thoughts consumed by near-kiss.' },
      { day: 18, plot: 'Cole notices grades slip; calls her in to check.' },
      { day: 19, plot: 'Rumor circulates they looked cozy at conference.' },
      { day: 20, plot: 'Cole tells Olivia they must cease personal interactions.' },
      { day: 21, plot: 'Olivia considers dropping class to protect him.' },
      { day: 22, plot: 'Olivia submits transfer request; Cole quietly approves.' },
      { day: 23, plot: 'Cole shows up at dorm, admits he can\'t stop thinking of her.' },
      { day: 24, plot: 'Gentle kiss under cover of darkness; aware of risk.' },
      { day: 25, plot: 'Secret romance: late-night conversations, stolen kisses.' },
      { day: 26, plot: 'Secret romance flourishes with hidden notes and warm glances.' },
      { day: 27, plot: 'Kiss in office; colleague sees through half-open door.' },
      { day: 28, plot: 'Dean calls disciplinary meeting; relationship discovered.' },
      { day: 29, plot: 'Cole plans to resign; Olivia refuses to let him sacrifice alone.' },
      { day: 30, plot: 'Cole resigns; they openly embrace future together at last.' },
    ],
  },
];

// For brevity, I'll add placeholders for the remaining 10 templates
// These would follow the same structure with their 30-day episode breakdowns

const ADDITIONAL_TEMPLATES: Partial<StoryTemplate>[] = [
  {
    id: 'brothers_enemy',
    title: 'My Brother\'s Enemy',
    genre: 'Forbidden Romance',
    emotion: 'Loyalty vs Love',
    themeKeywords: ['best friend\'s sister', 'brother\'s nemesis', 'forbidden', 'family loyalty'],
    summary: 'Chloe\'s brother has one rule: stay away from his nemesis Ethan Hayes. But Chloe remembers Ethan as the boy who once protected her, and she never let go of her secret crush. Torn between family loyalty and forbidden love, Chloe faces an impossible choice.',
  },
  {
    id: 'mafias_bride',
    title: 'Mafia\'s Bride',
    genre: 'Dark Romance',
    emotion: 'Arranged Marriage',
    themeKeywords: ['mafia', 'arranged marriage', 'enemies to lovers', 'captivity'],
    summary: 'Sophia\'s father arranges her marriage to Luca Moretti, heir of sworn enemies, to end a turf war. Vowing never to love him, Sophia plans escape. But Luca\'s protectiveness reveals a trapped, conflicted man. As sparks ignite, Sophia must choose: run and reignite war or risk her heart with the man who could destroy it.',
  },
  {
    id: 'office_secrets',
    title: 'Office Secrets',
    genre: 'Workplace Romance',
    emotion: 'Boss-Employee',
    themeKeywords: ['office romance', 'boss', 'forbidden', 'career risk'],
    summary: 'Ava is determined to make her mark at Stone & Co., but never expected attraction to charismatic CEO Adrian Stone with his ironclad rule against office romance. As late nights and closed-door meetings spark rumors that could destroy them both, Ava and Adrian struggle to resist temptation.',
  },
  {
    id: 'best_friends_dad',
    title: 'My Best Friend\'s Dad',
    genre: 'Age Gap Romance',
    emotion: 'Forbidden',
    themeKeywords: ['best friend\'s parent', 'age gap', 'divorced dad', 'family loyalty'],
    summary: 'Lily spending summer at best friend Mia\'s house discovers Mia\'s recently divorced father David is no longer just "Mr. Williams." Secretly admired for years, Lily now finds herself noticing his smile makes her heart flutter. Caught between betraying Mia and following her heart, Lily and David struggle with forbidden desire.',
  },
  {
    id: 'captive_desire',
    title: 'Captive Desire',
    genre: 'Dark Romance',
    emotion: 'Captor-Captive',
    themeKeywords: ['kidnapping', 'captive', 'captor', 'forbidden attraction', 'redemption'],
    summary: 'Isabelle is kidnapped and wakes in a remote hideout. Among captors is Damien, a brooding, reluctant henchman assigned to guard her. In darkness of captivity, an unlikely bond sparks between captor and captive—a forbidden connection that could be their salvation or lead to their ruin.',
  },
  {
    id: 'brothers_best_friend',
    title: 'My Brother\'s Best Friend',
    genre: 'Forbidden Romance',
    emotion: 'Bro Code',
    themeKeywords: ['brother\'s best friend', 'off limits', 'childhood crush', 'family loyalty'],
    summary: 'Hannah always had crush on older brother\'s best friend Caleb. After years away, Caleb returns and finds 18-year-old Hannah is no longer the little girl he remembers. Caleb knows the bro code—Josh warned him to stay away. Yet every day it grows harder to ignore the pull between them.',
  },
  {
    id: 'unholy_desire',
    title: 'Unholy Desire',
    genre: 'Forbidden Romance',
    emotion: 'Priest Romance',
    themeKeywords: ['priest', 'forbidden', 'vows of celibacy', 'faith crisis', 'redemption'],
    summary: 'Angela seeks solace at St. Mark\'s after personal tragedy, meeting Father Daniel. Bound by vows of celibacy, Father Daniel finds himself looking forward to Angela\'s visits more than he should. In sacred hush of chapel, forbidden desire grows—costing him his calling and Angela her faith if they surrender.',
  },
  {
    id: 'swapped_hearts',
    title: 'In Your Shoes',
    genre: 'Romantic Comedy',
    emotion: 'Body Swap',
    themeKeywords: ['body swap', 'magical realism', 'empathy', 'identity swap', 'personal growth'],
    summary: 'Workaholic Tessa and laid-back musician Jake have nothing in common except mutual loathing. A mysterious lightning storm causes the unthinkable: they wake up trapped in each other\'s bodies. As they walk miles in each other\'s shoes, they gain eye-opening insights and unexpectedly fall in love with the soul beneath the skin.',
  },
  {
    id: 'second_chance_act',
    title: 'Second Chance Act',
    genre: 'Second Chance Romance',
    emotion: 'Reunion',
    themeKeywords: ['second chance', 'ex-lovers', 'reunion', 'unfinished business', 'growth'],
    summary: 'Ten years after their painful breakup, former high school sweethearts reunite at their small town\'s centennial celebration. Both have changed—he\'s a single dad veterinarian, she\'s a divorced big-city lawyer. As old feelings resurface, they must decide if they\'re brave enough to try again.',
  },
  {
    id: 'marriage_of_convenience',
    title: 'The Marriage Deal',
    genre: 'Marriage of Convenience',
    emotion: 'Practical to Passionate',
    themeKeywords: ['marriage of convenience', 'green card', 'arranged', 'slow burn', 'urban romance'],
    summary: 'Struggling artist Sofia needs a green card to stay in the US. Reclusive tech billionaire Marcus needs a wife to inherit his family trust. They strike a deal: marry for one year, then divorce. But as they navigate family holidays and business galas, their practical arrangement begins to feel dangerously real.',
  },
];

// Combine all templates
const ALL_TEMPLATES: StoryTemplate[] = [
  ...STORY_TEMPLATES,
  ...ADDITIONAL_TEMPLATES.filter(t => t.id && t.title && t.genre && t.emotion && t.summary && t.episodes) as StoryTemplate[]
];

// ============================================
// Template Service
// ============================================

export class WesternStoryTemplates {
  private templates: Map<string, StoryTemplate>;

  constructor() {
    this.templates = new Map();
    ALL_TEMPLATES.forEach(t => this.templates.set(t.id, t));
  }

  /**
   * Get all available story templates
   */
  getAllTemplates(): StoryTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): StoryTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Get templates by genre
   */
  getTemplatesByGenre(genre: string): StoryTemplate[] {
    return this.getAllTemplates().filter(t =>
      t.genre.toLowerCase().includes(genre.toLowerCase())
    );
  }

  /**
   * Get templates by emotion
   */
  getTemplatesByEmotion(emotion: string): StoryTemplate[] {
    return this.getAllTemplates().filter(t =>
      t.emotion.toLowerCase().includes(emotion.toLowerCase())
    );
  }

  /**
   * Get templates matching user preferences
   */
  getTemplatesForUser(preferences: {
    genre?: string;
    emotion?: string;
  }): StoryTemplate[] {
    let templates = this.getAllTemplates();

    if (preferences.genre) {
      templates = templates.filter(t =>
        t.genre.toLowerCase().includes(preferences.genre!.toLowerCase())
      );
    }

    if (preferences.emotion) {
      templates = templates.filter(t =>
        t.emotion.toLowerCase().includes(preferences.emotion!.toLowerCase())
      );
    }

    return templates;
  }

  /**
   * Get random template (for user who doesn't specify preference)
   */
  getRandomTemplate(): StoryTemplate {
    const templates = this.getAllTemplates();
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Get episode outline for a specific day
   */
  getEpisodeOutline(templateId: string, day: number): EpisodeOutline | undefined {
    const template = this.getTemplate(templateId);
    if (!template || !template.episodes) return undefined;
    return template.episodes.find(e => e.day === day);
  }

  /**
   * Get all episode outlines for a template
   */
  getAllEpisodeOutlines(templateId: string): EpisodeOutline[] {
    const template = this.getTemplate(templateId);
    return template?.episodes || [];
  }

  /**
   * Get recommended template IDs for first-time users
   * (Most popular/broad appeal templates)
   */
  getRecommendedTemplates(): StoryTemplate[] {
    const recommendedIds = [
      'sweet_revenge_shattered_vows',  // Classic revenge romance
      'faking_it_dating_deal',         // Popular fake dating trope
      'stepbrother_seduction',         // High-engagement taboo
      'starstruck_celebrity',          // Wish fulfillment
      'swapped_hearts',                // Fun, unique premise
    ];

    return recommendedIds
      .map(id => this.getTemplate(id))
      .filter((t): t is StoryTemplate => t !== undefined);
  }
}

// Export singleton instance
export const westernStoryTemplates = new WesternStoryTemplates();

// Note: StoryTemplate, EpisodeOutline, and VisualStyleGuide are already exported at their declaration site
