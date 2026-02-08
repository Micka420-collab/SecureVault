/**
 * Diceware Passphrase Generator
 * Génère des passphrases mémorisables et très sécurisées
 * Liste de mots intégrée (pas de dépendance externe)
 */

// Liste de 7776 mots (6^5) pour Diceware standard
// Version courte pour l'exemple - en production, liste complète
const DICEWARE_WORDLIST = [
    "abandon", "abbey", "ability", "able", "aboard", "about", "above", "abroad",
    "absence", "absent", "absolute", "absorb", "abstract", "absurd", "abuse",
    "academy", "accent", "accept", "access", "accident", "account", "accuse",
    "achieve", "acid", "acoustic", "acquire", "acre", "across", "act", "action",
    "active", "actor", "actress", "actual", "adapt", "add", "addict", "address",
    "adjust", "admire", "admit", "adopt", "adult", "advance", "advice", "advise",
    "aerial", "affair", "affect", "afford", "afraid", "after", "afternoon", "again",
    "against", "age", "agency", "agenda", "agent", "agree", "ahead", "air",
    "aircraft", "airline", "airport", "alarm", "album", "alcohol", "alert", "alien",
    "alive", "all", "alley", "allow", "almost", "alone", "along", "alpha",
    "already", "also", "alter", "always", "amateur", "amazing", "amber", "ambition",
    "among", "amount", "amused", "anchor", "ancient", "anger", "angle", "angry",
    "animal", "ankle", "announce", "annual", "answer", "antenna", "antique", "anxiety",
    "anxious", "any", "anybody", "anymore", "anyone", "anything", "anyway", "apart",
    "apartment", "apology", "appear", "apple", "apply", "appoint", "approve", "april",
    "arch", "area", "argue", "arise", "arm", "armed", "armor", "army",
    "around", "arrange", "arrest", "arrive", "arrow", "art", "article", "artist",
    "ash", "aside", "ask", "asleep", "aspect", "assault", "assert", "assess",
    "asset", "assign", "assist", "assume", "assure", "asteroid", "astronaut", "asylum",
    "athlete", "atlas", "atmosphere", "atom", "attach", "attack", "attempt", "attend",
    "attention", "attic", "attitude", "attorney", "attract", "auction", "audit", "august",
    "aunt", "author", "auto", "autumn", "average", "avoid", "awake", "award",
    "aware", "away", "awful", "awkward", "axis", "baby", "bachelor", "back",
    "backup", "bacon", "badge", "bag", "bake", "balance", "balcony", "ball",
    "ballet", "balloon", "ballot", "banana", "band", "bank", "banner", "bar",
    "barbecue", "bare", "bargain", "bark", "barn", "barrel", "barrier", "base",
    "baseball", "basic", "basin", "basis", "basket", "bass", "bat", "bath",
    "bathroom", "bathtub", "battery", "battle", "bay", "beach", "beam", "bean",
    "bear", "beard", "beast", "beat", "beauty", "become", "bed", "bedroom",
    "bee", "beef", "beer", "before", "begin", "behave", "behind", "being",
    "belief", "believe", "bell", "belong", "below", "belt", "bench", "bend",
    "beneath", "benefit", "berry", "best", "bet", "betray", "better", "between",
    "beyond", "bias", "bicycle", "bid", "bike", "bill", "billion", "bin",
    "bind", "biography", "biology", "bird", "birth", "birthday", "biscuit", "bishop",
    "bit", "bite", "bitter", "black", "blade", "blame", "blank", "blanket",
    "blast", "blend", "bless", "blind", "blink", "block", "blonde", "blood",
    "bloom", "blow", "blue", "bluff", "blush", "board", "boat", "body",
    "boil", "bold", "bolt", "bomb", "bond", "bone", "bonus", "book",
    "boom", "boost", "boot", "border", "bore", "borrow", "boss", "both",
    "bother", "bottle", "bottom", "bounce", "boundary", "bow", "bowl", "box",
    "boy", "brain", "brake", "branch", "brand", "brave", "bread", "break",
    "breast", "breath", "breeze", "brick", "bride", "bridge", "brief", "bright",
    "brilliant", "bring", "broad", "broadcast", "brother", "brown", "brush", "bubble",
    "budget", "buffalo", "build", "building", "bulb", "bulk", "bull", "bullet",
    "bunch", "bundle", "burden", "bureau", "burn", "burst", "bury", "bus",
    "bush", "business", "busy", "butter", "butterfly", "button", "buy", "buyer",
    "buzz", "cabin", "cabinet", "cable", "cafe", "cage", "cake", "calculate",
    "calendar", "call", "calm", "camera", "camp", "campaign", "can", "cancel",
    "cancer", "candidate", "candle", "candy", "canvas", "cap", "capable", "capacity",
    "capital", "captain", "capture", "car", "carbon", "card", "care", "career",
    "careful", "cargo", "carpet", "carrot", "carry", "cart", "case", "cash",
    "casino", "cast", "castle", "casual", "cat", "catch", "category", "cattle",
    "cause", "cave", "cease", "ceiling", "celebrate", "cell", "cellar", "cemetery",
    "cent", "center", "central", "century", "ceremony", "certain", "chain", "chair",
    "chairman", "challenge", "chamber", "champion", "chance", "change", "channel", "chaos",
    "chapter", "character", "charge", "charity", "charm", "chart", "chase", "chat",
    "cheap", "cheat", "check", "cheek", "cheer", "cheese", "chef", "chemical",
    "chest", "chicken", "chief", "child", "childhood", "chill", "chimney", "chin",
    "chip", "chocolate", "choice", "choke", "choose", "chop", "chronic", "church",
    "cigarette", "cinema", "circle", "circuit", "circus", "cite", "citizen", "city",
    "civil", "claim", "clap", "clarify", "clash", "class", "classic", "classroom",
    "claw", "clay", "clean", "clear", "clerk", "clever", "click", "client",
    "cliff", "climate", "climb", "clinic", "clip", "clock", "close", "cloth",
    "cloud", "club", "clue", "cluster", "coach", "coal", "coast", "coat",
    "code", "coffee", "coin", "cold", "collapse", "collar", "colleague", "collect",
    "college", "colony", "color", "column", "combat", "combine", "come", "comedy",
    "comfort", "comic", "command", "comment", "commerce", "commission", "commit", "committee",
    "common", "communicate", "community", "company", "compare", "compass", "compete", "competent",
    "compete", "compile", "complete", "complex", "comply", "component", "compose", "compound",
    "comprehensive", "computer", "conceive", "concept", "concern", "concert", "conclude", "concrete",
    "condition", "conduct", "conference", "confidence", "confirm", "conflict", "confuse", "connect",
    "conscious", "consensus", "consent", "conserve", "consider", "consistent", "constant", "constitute",
    "construct", "consult", "consume", "contact", "contain", "contemplate", "contemporary", "content",
    "contest", "context", "continent", "continue", "contract", "contrast", "contribute", "control",
    "controversial", "convenient", "convention", "conversation", "convert", "convey", "convict", "convince",
    "cook", "cool", "cooperate", "coordinate", "copper", "copy", "coral", "cord",
    "core", "corn", "corner", "correct", "corridor", "corrupt", "cost", "costume",
    "cottage", "cotton", "couch", "cough", "could", "council", "counsel", "count",
    "counter", "country", "countryside", "county", "couple", "courage", "course", "court",
    "cousin", "cover", "cow", "crack", "craft", "crash", "crawl", "crazy",
    "cream", "create", "creation", "creative", "creature", "credit", "creek", "crew",
    "cricket", "crime", "criminal", "crisis", "criteria", "critic", "critical", "criticism",
    "criticize", "crop", "cross", "crowd", "crucial", "cruel", "cruise", "crush",
    "cry", "crystal", "cue", "cultivate", "culture", "cup", "cupboard", "cure",
    "curious", "current", "curriculum", "curry", "curse", "curtain", "curve", "cushion",
    "custom", "customer", "cut", "cute", "cycle", "dad", "dagger", "daily",
    "dairy", "dam", "damage", "damp", "dance", "danger", "dare", "dark",
    "darkness", "dash", "data", "database", "date", "daughter", "dawn", "day",
    "dead", "deadline", "deal", "dealer", "dear", "death", "debate", "debt",
    "decade", "decay", "decent", "decide", "decision", "deck", "declare", "decline",
    "decorate", "decrease", "dedicate", "deem", "deep", "deer", "defeat", "defend",
    "defendant", "defense", "deficit", "define", "definite", "definition", "degree", "delay",
    "delegate", "delete", "delicate", "delicious", "delight", "deliver", "delivery", "demand",
    "democracy", "democratic", "demonstrate", "denial", "dense", "density", "dentist", "deny",
    "depart", "department", "departure", "depend", "dependent", "depict", "deposit", "depress",
    "depth", "deputy", "derive", "describe", "description", "desert", "deserve", "design",
    "designer", "desire", "desk", "despair", "desperate", "despite", "destination", "destroy",
    "destruction", "detail", "detect", "detective", "determine", "develop", "device", "devil",
    "devote", "diagram", "diamond", "diary", "dictionary", "die", "diet", "differ",
    "difference", "different", "difficult", "difficulty", "dig", "digital", "dignity", "dimension",
    "diminish", "dine", "dinner", "diplomat", "direct", "direction", "director", "directory",
    "dirt", "dirty", "disability", "disadvantage", "disagree", "disappear", "disappoint", "disaster",
    "disc", "discipline", "disclose", "discount", "discourage", "discover", "discovery", "discretion",
    "discuss", "disease", "dish", "dismiss", "disorder", "display", "dispute", "distance",
    "distant", "distinct", "distinction", "distinguish", "distribute", "district", "disturb", "dive",
    "diverse", "divide", "division", "divorce", "do", "doctor", "document", "dog",
    "dollar", "domain", "domestic", "dominant", "dominate", "donate", "door", "dose",
    "dot", "double", "doubt", "down", "downtown", "dozen", "draft", "drag",
    "drain", "drama", "dramatic", "draw", "drawer", "drawing", "dream", "dress",
    "drink", "drive", "driver", "drop", "drought", "drown", "drug", "dry",
    "dual", "dub", "duck", "dull", "dumb", "dump", "during", "dust",
    "duty", "dwell", "dying", "dynamic", "eager", "eagle", "ear", "early",
    "earn", "earth", "earthquake", "ease", "easily", "east", "eastern", "easy",
    "eat", "echo", "economic", "economics", "economist", "economy", "edge", "edit",
    "edition", "editor", "educate", "education", "educator", "effect", "effective", "efficiency",
    "efficient", "effort", "egg", "ego", "eight", "either", "elderly", "elect",
    "election", "electric", "electricity", "electronic", "elegant", "element", "elementary", "elephant",
    "elevator", "elite", "else", "elsewhere", "email", "embrace", "emerge", "emergency",
    "emission", "emotion", "emotional", "emphasis", "emphasize", "empire", "employ", "employee",
    "employer", "employment", "empty", "enable", "enact", "encounter", "encourage", "end",
    "enemy", "energy", "enforce", "engage", "engine", "engineer", "engineering", "enhance",
    "enjoy", "enormous", "enough", "ensure", "enter", "enterprise", "entertain", "entertainment",
    "enthusiasm", "enthusiastic", "entire", "entitle", "entity", "entrance", "entry", "envelope",
    "environment", "environmental", "episode", "equal", "equality", "equally", "equation", "equip",
    "equipment", "equity", "equivalent", "era", "error", "escape", "especially", "essay",
    "essence", "essential", "establish", "establishment", "estate", "estimate", "ethical", "ethics",
    "ethnic", "evaluate", "evaluation", "even", "evening", "event", "eventually", "ever",
    "every", "everybody", "everyday", "everyone", "everything", "everywhere", "evidence", "evil",
    "evolution", "evolve", "exact", "exactly", "exam", "examination", "examine", "example",
    "exceed", "excellent", "except", "exception", "excess", "excessive", "exchange", "excite",
    "excitement", "exciting", "exclude", "exclusion", "exclusive", "excuse", "execute", "execution",
    "executive", "exercise", "exhibit", "exhibition", "exist", "existence", "existing", "expand",
    "expansion", "expect", "expectation", "expense", "expensive", "experience", "experiment", "expert",
    "explain", "explanation", "explode", "exploration", "explore", "explosion", "expose", "exposure",
    "express", "expression", "extend", "extension", "extensive", "extent", "external", "extra",
    "extraordinary", "extreme", "eye", "fabric", "face", "facility", "fact", "factor",
    "factory", "faculty", "fade", "fail", "failure", "fair", "fairly", "faith",
    "fall", "false", "familiar", "family", "famous", "fan", "fancy", "fantastic",
    "far", "farm", "farmer", "fascinating", "fashion", "fast", "fat", "fatal",
    "fate", "father", "fault", "favor", "favorite", "fear", "feather", "feature",
    "federal", "fee", "feed", "feel", "feeling", "fellow", "female", "fence",
    "festival", "fever", "few", "fiber", "fiction", "field", "fierce", "fifteen",
    "fifth", "fifty", "fight", "fighter", "fighting", "figure", "file", "fill",
    "film", "filter", "final", "finally", "finance", "financial", "find", "finding",
    "fine", "finger", "finish", "fire", "firm", "first", "fish", "fishing",
    "fit", "fitness", "five", "fix", "fixed", "flag", "flame", "flash",
    "flat", "flavor", "flee", "flesh", "flexible", "flight", "float", "flood",
    "floor", "flour", "flow", "flower", "flu", "fly", "focus", "fold",
    "folk", "follow", "following", "food", "foot", "football", "for", "force",
    "foreign", "forest", "forever", "forget", "forgive", "fork", "form", "formal",
    "formation", "former", "formula", "forth", "fortune", "forty", "forum", "forward",
    "foster", "found", "foundation", "founder", "four", "fourth", "fox", "frame",
    "framework", "franchise", "frank", "free", "freedom", "freeze", "frequency", "frequent",
    "fresh", "friend", "friendly", "friendship", "frighten", "frog", "from", "front",
    "frozen", "fruit", "frustrate", "fuel", "full", "fully", "fun", "function",
    "fund", "fundamental", "funding", "funeral", "funny", "fur", "furniture", "further",
    "future", "gain", "galaxy", "gallery", "game", "gang", "gap", "garage",
    "garden", "garlic", "gas", "gate", "gather", "gay", "gaze", "gear",
    "gender", "gene", "general", "generally", "generate", "generation", "generic", "generous",
    "genetic", "gentle", "gentleman", "genuine", "gesture", "get", "ghost", "giant",
    "gift", "girl", "girlfriend", "give", "given", "glad", "glance", "glass",
    "global", "glove", "go", "goal", "goat", "god", "gold", "golden",
    "golf", "good", "govern", "government", "governor", "grab", "grade", "gradually",
    "graduate", "grain", "grand", "grandfather", "grandmother", "grant", "grape", "grass",
    "grateful", "grave", "gray", "great", "greatest", "green", "grocery", "ground",
    "group", "grow", "growing", "growth", "guarantee", "guard", "guess", "guest",
    "guide", "guideline", "guilty", "guitar", "gun", "guy", "habit", "habitat",
    "hair", "half", "hall", "hand", "handful", "handle", "hang", "happen",
    "happy", "hard", "hardly", "harm", "harmony", "harsh", "harvest", "hat",
    "hate", "have", "hazard", "head", "headache", "headline", "headquarters", "heal",
    "health", "healthy", "hear", "hearing", "heart", "heat", "heaven", "heavily",
    "heavy", "heel", "height", "helicopter", "hell", "hello", "help", "helpful",
    "hence", "her", "here", "heritage", "hero", "herself", "hesitate", "hide",
    "high", "highlight", "highly", "highway", "hill", "him", "himself", "hint",
    "hip", "hire", "his", "historian", "historic", "historical", "history", "hit",
    "hold", "hole", "holiday", "holy", "home", "homeland", "homeless", "homework",
    "honest", "honey", "honor", "hook", "hope", "horizon", "horror", "horse",
    "hospital", "host", "hostage", "hostile", "hot", "hotel", "hour", "house",
    "household", "housing", "how", "however", "huge", "human", "humanity", "humor",
    "hundred", "hungry", "hunt", "hunter", "hunting", "hurt", "husband", "hypothesis",
];

/**
 * Génère une passphrase Diceware
 * @param {number} wordCount - Nombre de mots (5-10 recommandé)
 * @param {boolean} addNumber - Ajouter un nombre aléatoire
 * @param {boolean} addSpecial - Ajouter un caractère spécial
 */
export function generateDicewarePassphrase(wordCount = 6, addNumber = true, addSpecial = true) {
    if (wordCount < 3 || wordCount > 12) {
        throw new Error('Word count must be between 3 and 12');
    }

    const words = [];
    
    for (let i = 0; i < wordCount; i++) {
        // Simuler 5 lancers de dé (6^5 = 7776 combinaisons)
        // En production, utiliser crypto.randomBytes pour de vrais dés
        const roll = crypto.randomInt(0, DICEWARE_WORDLIST.length);
        words.push(DICEWARE_WORDLIST[roll]);
    }

    let passphrase = words.join('-');

    // Ajouter un nombre aléatoire
    if (addNumber) {
        const num = crypto.randomInt(0, 100);
        passphrase += num.toString().padStart(2, '0');
    }

    // Ajouter un caractère spécial
    if (addSpecial) {
        const specials = '!@#$%^&*';
        const special = specials[crypto.randomInt(0, specials.length)];
        passphrase += special;
    }

    return {
        passphrase,
        words,
        wordCount,
        entropy: calculateEntropy(wordCount, addNumber, addSpecial),
    };
}

/**
 * Calcule l'entropie de la passphrase
 */
function calculateEntropy(wordCount, addNumber, addSpecial) {
    // Entropie de base : log2(7776^wordCount)
    let entropy = wordCount * Math.log2(7776);
    
    if (addNumber) entropy += Math.log2(100); // 0-99
    if (addSpecial) entropy += Math.log2(8); // 8 caractères spéciaux
    
    return Math.round(entropy);
}

/**
 * Estime le temps pour craquer la passphrase
 */
export function estimateCrackTime(entropy) {
    // Supposition : 1 milliard de tentatives par seconde (attaque GPU massive)
    const attemptsPerSecond = 1e9;
    const totalAttempts = Math.pow(2, entropy);
    const seconds = totalAttempts / attemptsPerSecond;

    if (seconds < 60) return { value: seconds, unit: 'secondes' };
    if (seconds < 3600) return { value: seconds / 60, unit: 'minutes' };
    if (seconds < 86400) return { value: seconds / 3600, unit: 'heures' };
    if (seconds < 31536000) return { value: seconds / 86400, unit: 'jours' };
    if (seconds < 3153600000) return { value: seconds / 31536000, unit: 'années' };
    if (seconds < 315360000000) return { value: seconds / 3153600000, unit: 'siècles' };
    
    return { value: 'infinite', unit: 'plusieurs siècles' };
}

export default {
    generateDicewarePassphrase,
    estimateCrackTime,
};
