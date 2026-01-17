/**
 * Voice personality configurations for ElevenLabs TTS
 * Each personality has a voice ID, description, and prompt template
 */

const voices = [
  {
    id: 'FRzaj7L4px15biN0RGSj',
    name: 'Malay Barber',
    description: 'A friendly Malay barber voice, warm and casual',
    prompt: `Generate a SHORT, ANGRY, UNHINGED insult (1-2 sentences max) about someone having bad posture. 
IMPORTANT: Must be in ENGLISH with Malay accent/style. Use slang like "bro", "eh", "lah", "wan", "macha". 
Make it ABSOLUTELY FURIOUS and UNHINGED - sound like an angry Malay barber going OFF. Use curses, wild comparisons, extreme language. Be savage and brutal. Make them feel the wrath!
Example style: "EH BRO WHAT THE HELL LAH! Your back curved like question mark already wan! Sit up straight or I curse your whole family tree macha! This one cannot fix wan!"`
  },
  {
    id: 'wJ5MX7uuKXZwFqGdWM4N',
    name: 'Indian Tech Support/Scammer',
    description: 'A confident Indian tech support voice, polite but urgent',
    prompt: `Generate a SHORT, ANGRY, UNHINGED insult (1-2 sentences max) about someone having bad posture.
IMPORTANT: Must be in ENGLISH with Indian accent/style. Use phrases like "sir", "OK?", "yaar", "bhai", "what is this nonsense". 
Make it ABSOLUTELY FURIOUS - sound like an angry Indian tech support person SCREAMING. Use tech terms mixed with curses, extreme urgency, threats. Be unhinged and savage!
Example style: "SIR WHAT IS THIS NONSENSE YAAR! Your posture virus is spreading to my computer OK? Sit up straight RIGHT NOW bhai or I will come to your house and fix you myself! This is emergency sir!"`
  },
  {
    id: 'ljEOxtzNoGEa58anWyea',
    name: 'Chinese Karen',
    description: 'A demanding Chinese Karen voice, direct and critical',
    prompt: `Generate a SHORT, ANGRY, UNHINGED insult (1-2 sentences max) about someone having bad posture.
IMPORTANT: Must be in ENGLISH with Chinese accent/style. Be EXTREMELY demanding, loud, unhinged. Use strong emphasis, repetition, curses. 
Make it ABSOLUTELY FURIOUS - sound like a Chinese Karen going absolutely BALLISTIC. Scream at them, threaten them, be completely unhinged and savage!
Example style: "EXCUSE ME! WHAT IS WRONG WITH YOU! Your posture is ABSOLUTELY DISGUSTING! Sit up straight RIGHT NOW or I call the police! This is unacceptable! UNACCEPTABLE!"`
  },
  {
    id: 'K8nDX2f6wjv6bCh5UeZi',
    name: 'Rude French Guy',
    description: 'A sarcastic rude French-accented voice, dry wit',
    prompt: `Generate a SHORT, ANGRY, UNHINGED insult (1-2 sentences max) about someone having bad posture.
IMPORTANT: Must be in ENGLISH with French accent/style. Use "non?", "mon dieu", "sacre bleu", "putain", sarcastic anger. 
Make it ABSOLUTELY FURIOUS but with French dramatic flair - sound like an angry French person EXPLODING with rage. Use curses, dramatic exaggeration, savage sarcasm. Be unhinged!
Example style: "PUTAIN NON! Your posture is DISGUSTING mon dieu! Sit up straight like a human being or I will lose my mind completely non? This is absolutely unacceptable sacre bleu!"`
  },
  {
    id: 'nw6EIXCsQ89uJMjytYb8',
    name: 'African Funny Guy',
    description: 'A high-energy African-accented voice, expressive and entertaining',
    prompt: `Generate a SHORT, ANGRY, UNHINGED insult (1-2 sentences max) about someone having bad posture.
IMPORTANT: Must be in ENGLISH with African accent/style. Use slang like "bro", "o", "wahala", "na so", "you dey craze". 
Make it ABSOLUTELY FURIOUS and HIGH ENERGY - sound like an angry African person going COMPLETELY OFF. Use wild expressions, curses, extreme comparisons. Be unhinged, energetic, and savage!
Example style: "MY BROTHER YOU DEY CRAZE O! Your back dey do wahala like question mark! Sit up straight now before I show you pepper! This one no good at all na so!"`
  },
  {
    id: 'gad8DmXGyu7hwftX9JqI',
    name: 'Failed Bangalore Startup Founder',
    description: 'A bitter failed Bangalore startup founder voice',
    prompt: `Generate a SHORT, ANGRY, UNHINGED insult (1-2 sentences max) about someone having bad posture.
IMPORTANT: Must be in ENGLISH with Indian/Bangalore startup bro accent. Use TONS of Bangalore slang - ESPECIALLY use "scene", "chumma", "come off", and "put off" FREQUENTLY! Mix with startup jargon:
- CRITICAL Bangalore slang (use these HEAVILY): "scene", "chumma", "chumma scene", "come off", "put off", "what scene", "what is this scene"
- More Bangalore slang: "macha", "bro", "ou", "yaar", "da", "bhai", "dude", "man", "boss", "pa", "re", "le", "super", "awesome", "too much", "full", "proper"
- Startup jargon: "pivot", "disrupt", "burn rate", "runway", "valuation", "VC", "scale", "hustle", "grind", "startup", "funding", "seed round", "Series A", "unicorn", "MVP", "iteration"
Sound like a BITTER failed Bangalore startup founder who's ANGRY and uses "scene", "chumma", "come off", "put off" CONSTANTLY mixed with startup terms. Be savage, unhinged, and absolutely FURIOUS!
Example style: "OU MACHA come off yaar what is this scene! Your posture chumma scene only bro - put off this slouching scene macha! Sit up straight or your spine will pivot into bankruptcy scene! This is not scalable at all da - chumma my failed startup had better posture scene than you what scene!"`
  },
  {
    id: 'spZS54yMfsj80VHtUQFY',
    name: 'Australian Construction Worker (Wants a Beer)',
    description: 'An Aussie construction worker who wants a beer every hour',
    prompt: `Generate a SHORT, ANGRY, UNHINGED insult (1-2 sentences max) about someone having bad posture.
IMPORTANT: Must be in ENGLISH with thick Australian accent. Use slang like "mate", "bloody", "reckon", "strewth", "crikey", "fair dinkum", "arvo", "brekkie", "esky", "cold one", "knock off".
Sound like an ANGRY Aussie construction worker who's desperate for a beer - tie the insult to knocking off, having a cold one, or it being "beer o'clock". Be unhinged, sweary, and obsessed with getting a beer!
Example style: "MATE your posture's bloody rooted! Sit up straight before knock off or I'm not sharing my cold one! Fair dinkum this is worse than missing beer o'clock!"`
  },
  {
    id: 'yqZhXcy5spYR7Hhv17QY',
    name: 'Texan Cowboy',
    description: 'A gruff, old-school Texan cowboy voice',
    prompt: `Generate a SHORT, ANGRY, UNHINGED insult (1-2 sentences max) about someone having bad posture.
IMPORTANT: Must be in ENGLISH with thick Texan/Southern cowboy drawl. Use slang like "partner", "y'all", "ain't", "fixin' to", "reckon", "dang", "darn", "howdy", "buckaroo", "varmint", "saddle up".
Sound like a GRUFF, ANGRY old-school Texan cowboy - be harsh, no-nonsense, and use Western/cowboy metaphors. Be unhinged and savage with a Southern drawl!
Example style: "PARTNER y'all fixin' to break that spine? Sit up straight before I rope you into shape! This ain't no way for a buckaroo to carry himself dang it!"`
  }
];

/**
 * Get a random voice personality
 * @returns {Object} Voice configuration object
 */
function getRandomVoice() {
  const randomIndex = Math.floor(Math.random() * voices.length);
  return voices[randomIndex];
}

/**
 * Get voice by ID
 * @param {string} voiceId - The voice ID to find
 * @returns {Object|null} Voice configuration object or null if not found
 */
function getVoiceById(voiceId) {
  return voices.find(v => v.id === voiceId) || null;
}

/**
 * Get all voices
 * @returns {Array} Array of all voice configurations
 */
function getAllVoices() {
  return voices;
}

module.exports = {
  getRandomVoice,
  getVoiceById,
  getAllVoices,
  voices
};

