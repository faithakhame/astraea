/* ============================================================
   ASTRAEA — daily readings, moon weather, birth phases, matchmaking
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- daily reading pools (3 per domain, per sign) ---------- */
  const DAILY = {
    aries: {
      headline: [
        'Your first instinct is the right one today — say it before you talk yourself out of it.',
        'Momentum is on your side; the only wrong move is waiting for a better moment.',
        'Something you have been circling finally has a door. Walk through it before you describe it.',
      ],
      love: [
        'Lead with curiosity instead of conquest. Ask the second question.',
        'A blunt truth lands better than a beautiful hint — but soften the delivery, not the message.',
        'Someone is matching your pace. Let them catch you rather than racing ahead.',
      ],
      career: [
        'Start the thing. The plan will improve faster in motion than in your head.',
        'One decisive conversation clears a week of low-grade frustration.',
        'You are being watched for how you handle the small delay, not the big win.',
      ],
      money: [
        'A bold move is fine — just check the boring numbers underneath it first.',
        'Pause before the impulse buy that is really a mood looking for a destination.',
        'Money follows the courage you already have. Give it a system to land in.',
      ],
      wellbeing: [
        'Your body wants heat and movement: walk fast, stretch the jaw, sweat once.',
        'The headache is unmet momentum. Move before you decide anything.',
        'Rest is not the opposite of your ambition; it is the fuel line.',
      ],
    },
    taurus: {
      headline: [
        'Slow is not stuck. Today rewards the unhurried, deliberate version of you.',
        'Something genuinely good is already in your hands. Notice it before you upgrade it.',
        'Pleasure is information today. Follow what feels warm, textured and real.',
      ],
      love: [
        'Show up in person, not in a thoughtful message you draft and delete.',
        'Loyalty is your love language. Let someone feel it in a small, physical way.',
        'A gentle boundary said once is kinder than a resentment held for months.',
      ],
      career: [
        'The unglamorous task you keep postponing is the one that unlocks the week.',
        'Your steadiness is the product. Price it accordingly.',
        'Improve one system instead of starting one more project.',
      ],
      money: [
        'A good day to review the subscriptions you have stopped noticing.',
        'Spend on quality once rather than cheaply three times.',
        'Your security is built in quiet increments. Add one today.',
      ],
      wellbeing: [
        'Feed yourself something real and slow. Texture, warmth, no screen.',
        'Your neck is holding a sentence you have not said. Put your hand there and breathe.',
        'The body wants nature, not another hour of optimization.',
      ],
    },
    gemini: {
      headline: [
        'A conversation changes the shape of your day — stay for the interesting detour.',
        'You have too many tabs open, in every sense. Close three and the answer appears.',
        'Say the plain thing. The clever version is costing you closeness.',
      ],
      love: [
        'Flirt with your whole attention, not just your words.',
        'The person in front of you is not a puzzle to solve. Let them be surprising.',
        'Ask the question you have been avoiding by being funny.',
      ],
      career: [
        'Your ability to translate between two worlds is the value today. Use it out loud.',
        'Finish the small thing before you pitch the big one.',
        'Write it down. The idea is real, but it will not survive your memory.',
      ],
      money: [
        'A subscription, a course, a new app — the leak is novelty. Sleep on it.',
        'One clear price is worth three clever options.',
        'Your words are an asset. Charge for the thinking, not just the typing.',
      ],
      wellbeing: [
        'Your nervous system is running on notifications. Ten minutes of silence is medicine.',
        'Breathe longer out than in. The mind follows the exhale.',
        'Move your hands — write, cook, play. The restlessness wants a body.',
      ],
    },
    cancer: {
      headline: [
        'Your intuition has already answered. You are just waiting for permission to trust it.',
        'Home is a feeling you can build today in one small, deliberate act.',
        'The mood is the message. Tend it instead of overriding it.',
      ],
      love: [
        'Say the need out loud instead of making someone guess the riddle.',
        'Let yourself be taken care of. You do not have to earn the tenderness.',
        'A memory surfaces today. Let it be information, not a return address.',
      ],
      career: [
        'The person who feels looked after will do their best work for you. Use that.',
        'Ask to be paid for the emotional labour you have been giving away.',
        'Protect one hour of deep, uninterrupted work like it is your own child.',
      ],
      money: [
        'Security is a nervous-system project as much as a numbers project.',
        'A fear-based decision will cost more than the generous one.',
        'Put a little aside today, even if it is small. It tells your body you are safe.',
      ],
      wellbeing: [
        'Water is your medicine: drink it, bathe in it, let it carry the mood.',
        'Your stomach holds what you have not said. Eat slowly and kindly.',
        'Call the person who feels like home. It is not a weakness.',
      ],
    },
    leo: {
      headline: [
        'You do not need the room to applaud to know you were generous today.',
        'Create something that no one will grade. That is where the joy lives.',
        'Someone is watching you for permission to be fully themselves. Give it.',
      ],
      love: [
        'Be adored without testing it. Let the compliment land.',
        'The grand gesture is lovely; the ordinary Tuesday is the real proof.',
        'Say the apology plainly. Your pride will survive, and your love will grow.',
      ],
      career: [
        'Take the credit you earned, then give someone else the stage.',
        'Your warmth is a leadership skill. Use it in the meeting you are dreading.',
        'One bold, visible move beats a week of quiet excellence today.',
      ],
      money: [
        'Buy the one beautiful thing. Skip the twelve that announce it.',
        'Visibility is your income stream — invest in the work, not the image.',
        'Generosity is beautiful until it is funded by tomorrow. Check the account first.',
      ],
      wellbeing: [
        'Your heart wants play, not another performance. Do something silly.',
        'The spine carries your pride. Stretch it, roll your shoulders, stand tall.',
        'Let yourself be ordinary for an hour. Nobody is scoring you.',
      ],
    },
    virgo: {
      headline: [
        'Nothing about you needs correcting today. Let one thing be finished and good.',
        'The detail you are worried about is invisible to everyone but you.',
        'Service is your gift, but today it must include serving yourself first.',
      ],
      love: [
        'Let someone see you messy. The right person is not grading you.',
        'Say what you appreciate specifically. Precision is your love language.',
        'The criticism you are about to offer is really a want. Name the want.',
      ],
      career: [
        'Ship the imperfect thing. Visible and done beats perfect and private.',
        'Your standards are an asset; your perfectionism is a delay tactic.',
        'A small system fix today saves you an hour a week for a year.',
      ],
      money: [
        'Open the statement you have been avoiding. The number is smaller than the dread.',
        'One boring rule, automated, will do more than a month of willpower.',
        'You are allowed to spend on something that has no practical purpose.',
      ],
      wellbeing: [
        'Your gut and your nerves are the same conversation. Eat, then rest.',
        'The worry is not a plan. Write it down, then close the notebook.',
        'Do one thing badly on purpose and survive it.',
      ],
    },
    libra: {
      headline: [
        'Beauty is a form of honesty today. Choose what genuinely pleases you, not what pleases the room.',
        'A decision becomes easy once you stop trying to keep everyone happy.',
        'You can be kind and still be clear. Try both in the same sentence.',
      ],
      love: [
        'Bring a whole self to the table. Partnership is a meeting, not a merging.',
        'Say the unpopular preference. The right person will find it attractive.',
        'Romance lives in the specific, not the tasteful. Be specific today.',
      ],
      career: [
        'Set a decision deadline. Eighty per cent certainty is enough.',
        'Your taste is a commercial asset. Stop giving it away as "just a favour."',
        'The diplomatic route is not always the honest one. Choose honest once today.',
      ],
      money: [
        'Put a number on generosity before the evening begins.',
        'Beauty is a legitimate line item — the invisible people-pleasing is not.',
        'One elegant purchase beats five compensatory ones.',
      ],
      wellbeing: [
        'Your lower back and kidneys want water and rest, not another opinion.',
        'Choose symmetry: equal giving and receiving today, on purpose.',
        'Sit somewhere beautiful for ten minutes and do nothing useful.',
      ],
    },
    scorpio: {
      headline: [
        'The truth you are holding is ready to be said — carefully, once, without the blade.',
        'Not everything must be excavated today. Some things heal underground.',
        'Your intensity is a gift when it is aimed at creation, not surveillance.',
      ],
      love: [
        'Trust is a practice, not a test you design in secret.',
        'Let someone see the soft version before you decide it is safe.',
        'The jealousy is information about a need. Say the need, not the accusation.',
      ],
      career: [
        'You are the person called when it actually matters. Act like it, calmly.',
        'Use your read on people to build, not to win the room.',
        'One decisive, private move today is worth a month of visible manoeuvring.',
      ],
      money: [
        'Bring the secret number into the light with one trusted person.',
        'Your patience with risk is rare. Do not confuse it with all-or-nothing.',
        'Power shared compounds. Power hidden leaks.',
      ],
      wellbeing: [
        'Your body wants release, not more containment. Move, cry, sweat, exhale.',
        'The grudge is a physical weight. Set down one small piece of it.',
        'Silence is restorative today — but choose it, do not hide in it.',
      ],
    },
    sagittarius: {
      headline: [
        'The answer you are looking for is not in a new place. Stay long enough to find it here.',
        'Tell the truth with a sense of humour, not a sense of superiority.',
        'One honest conversation expands your world more than a plane ticket today.',
      ],
      love: [
        'Adventure is easy; intimacy is the real expedition. Stay for the ordinary Tuesday.',
        'The joke you make about the tender thing is a door. Open it properly.',
        'Freedom and commitment are not opposites. Choose the person who gets that.',
      ],
      career: [
        'Say the thing nobody else will say in the meeting — then help build the solution.',
        'Build variety into the role before you blow it up.',
        'Your optimism is a strategy. Pair it with one unglamorous follow-up.',
      ],
      money: [
        'One account for the adventure, one for the boring future. Set it up today.',
        'Your generosity is beautiful. Do not fund it with tomorrow.',
        'A big idea needs a small first invoice. Send it.',
      ],
      wellbeing: [
        'Your hips and thighs hold the restlessness. Walk it out.',
        'Too much philosophy, not enough sleep. Choose the sleep.',
        'Go outside without a destination. Let the horizon do its work.',
      ],
    },
    capricorn: {
      headline: [
        'You are not behind. You are on a longer timeline than the people you compare yourself to.',
        'Do one thing badly today and enjoy it. The work will survive.',
        'The structure you built is holding. Let yourself stand inside it for a moment.',
      ],
      love: [
        'Let yourself be cared for before you have earned it. Love is not a review.',
        'The tenderness under the competence is the part worth showing.',
        'Take the afternoon off together. The empire will survive one pleasure.',
      ],
      career: [
        'Delegate the thing. Your standards will survive someone else meeting them.',
        'Play the ten-year game, then take one visible step today.',
        'Ask for the title you have already been doing the work for.',
      ],
      money: [
        'Money is your native language. Spend some of it on joy, deliberately.',
        'Scarcity logic long after scarcity has passed is a tax on your life.',
        'One long-term move today beats three clever short-term ones.',
      ],
      wellbeing: [
        'Your knees and bones want gentle load, not more sitting. Move slowly and well.',
        'Rest before you are finished. That is the whole instruction.',
        'Call the friend you keep postponing. It is not inefficient.',
      ],
    },
    aquarius: {
      headline: [
        'Being right is not the same as being close. Choose connection once today.',
        'The system is visible to you today. Say the elegant, simple version of the fix.',
        'Your strangeness is the point. Stop translating it for people who will not get it.',
      ],
      love: [
        'Come down from the head into the room. Say the vulnerable thing plainly.',
        'Space is not the same as distance. Tell them which one you need.',
        'Friendship is the floor of your love. Build on it, do not replace it.',
      ],
      career: [
        'Your idea needs a body: one prototype, one document, one meeting.',
        'Find the ally who translates your future into today. Then let them.',
        'Build influence through quality, not through arguing with authority.',
      ],
      money: [
        'Set the rule and let the machine enforce it. You are bad with vibes.',
        'A collective financial move may serve you better than a solo one.',
        'The future is not a plan for your rent. Automate the boring part first.',
      ],
      wellbeing: [
        'Your ankles and circulation want movement and warmth today.',
        'The feeling you keep analysing is weather. Let it be felt, not solved.',
        'One hour without input. No feeds, no ideas, just your own company.',
      ],
    },
    pisces: {
      headline: [
        'You do not have to disappear to be free. Get specific about one thing today.',
        'The dream has a deadline now. Let that be a kindness, not a cage.',
        'Your sensitivity is data. Write down what you picked up before it dissolves.',
      ],
      love: [
        'Love someone without becoming them. Keep the shoreline.',
        'Rescuing is not the same as loving. Let them carry their own weather.',
        'Show the ordinary you, not only the myth. That is where intimacy lives.',
      ],
      career: [
        'Give the dream a deadline and a collaborator who loves spreadsheets.',
        'Your gift reaches people through structure. Build the container.',
        'Say the price out loud. The work is worth more than you are charging.',
      ],
      money: [
        'One honest conversation about the loan is worth a year of vague dread.',
        'The kindest thing you can do for your future self is automate one thing.',
        'Your generosity needs a budget, not a ban.',
      ],
      wellbeing: [
        'Your feet want grounding: bare feet, warm water, a long exhale.',
        'You are carrying feelings that are not yours. Put them down gently.',
        'Sleep is a spiritual practice today. Protect it like a ritual.',
      ],
    },
  };

  /* ---------- moon-sign weather ---------- */
  const MOON_WEATHER = {
    aries: {
      title: 'Moon in Aries — the match-head moon',
      mood: 'Fast, blunt, brave, a little impatient.',
      do: ['Start the thing you have been circling', 'Move your body hard', 'Have the direct conversation'],
      dont: ['Pick a fight for the thrill of it', 'Mistake speed for direction'],
      note: 'Emotions arrive before thoughts today. Give the heat somewhere to go before you give it a target.',
    },
    taurus: {
      title: 'Moon in Taurus — the slow gold moon',
      mood: 'Grounded, sensual, stubborn, comfort-seeking.',
      do: ['Cook something real', 'Touch the earth, the fabric, the person', 'Finish one tangible thing'],
      dont: ['Dig in just to prove you cannot be moved', 'Confuse comfort with safety'],
      note: 'The body keeps the score today. Pleasure is not a reward; it is the medicine.',
    },
    gemini: {
      title: 'Moon in Gemini — the open-window moon',
      mood: 'Curious, quick, chatty, scattered.',
      do: ['Ask the second question', 'Write the messy first draft', 'Say the plain truth instead of the clever one'],
      dont: ['Start five things and finish none', 'Use humour to dodge the feeling'],
      note: 'Your mind is a crossroads. Choose one road and walk it for an hour.',
    },
    cancer: {
      title: 'Moon at home in Cancer — the tide moon',
      mood: 'Tender, nostalgic, protective, deeply intuitive.',
      do: ['Tend your home', 'Name the need out loud', 'Let yourself be held'],
      dont: ['Retreat and call it self-care', 'Make someone guess the riddle'],
      note: 'The mood is the message. You do not have to solve it; you have to feel it with company.',
    },
    leo: {
      title: 'Moon in Leo — the hearth-fire moon',
      mood: 'Warm, proud, dramatic, generous.',
      do: ['Create something no one grades', 'Give a sincere compliment', 'Let yourself be adored'],
      dont: ['Perform warmth instead of giving it', 'Keep score of who loved whom more'],
      note: 'The heart wants to be seen, not assessed. Show the real thing, not the highlights reel.',
    },
    virgo: {
      title: 'Moon in Virgo — the mending moon',
      mood: 'Precise, caring, anxious, improving.',
      do: ['Fix one small thing', 'Tidy a corner of your life', 'Offer practical help'],
      dont: ['Turn worry into a personality', 'Criticise the soft part of yourself'],
      note: 'Care is your language today. Make sure the first person you care for is you.',
    },
    libra: {
      title: 'Moon in Libra — the mirror moon',
      mood: 'Gracious, relational, aesthetic, indecisive.',
      do: ['Make something beautiful', 'Have the fair conversation', 'Choose the thing you actually prefer'],
      dont: ['Decide by committee', 'Choose peace over honesty'],
      note: 'Beauty is balance made visible. Put the scales down and pick a side with love.',
    },
    scorpio: {
      title: 'Moon in Scorpio — the deep-water moon',
      mood: 'Intense, private, perceptive, transforming.',
      do: ['Write what you would not say aloud', 'Let something be released', 'Trust one person with one truth'],
      dont: ['Test loyalty in secret', 'Confuse control with safety'],
      note: 'The feeling goes all the way down. You do not need to drain the whole ocean today.',
    },
    sagittarius: {
      title: 'Moon in Sagittarius — the far-horizon moon',
      mood: 'Restless, honest, buoyant, philosophical.',
      do: ['Tell the truth with humour', 'Learn something new', 'Make a plan that expands you'],
      dont: ['Promise more than you will stay for', 'Use optimism as avoidance'],
      note: 'The horizon is calling, but the answer is in the room. Stay long enough to find it.',
    },
    capricorn: {
      title: 'Moon in Capricorn — the stone-stair moon',
      mood: 'Sober, strategic, enduring, dryly funny.',
      do: ['Do the unglamorous task', 'Make the long-term plan', 'Rest without earning it first'],
      dont: ['Postpone joy until the work is done', 'Equate your worth with your output'],
      note: 'You are building something that will outlast the mood. Take the afternoon off anyway.',
    },
    aquarius: {
      title: 'Moon in Aquarius — the electric moon',
      mood: 'Detached, inventive, principled, contrary.',
      do: ['Solve the system, not the symptom', 'Spend time with chosen family', 'Say the unconventional truth'],
      dont: ['Use distance as objectivity', 'Argue for the sake of being right'],
      note: 'The future is arriving through your friendships today. Let yourself be known, not just understood.',
    },
    pisces: {
      title: 'Moon in Pisces — the ocean moon',
      mood: 'Dreamy, porous, compassionate, elusive.',
      do: ['Make art without a purpose', 'Listen to music with your eyes closed', 'Set one gentle boundary'],
      dont: ['Absorb feelings that are not yours', 'Vanish when it gets real'],
      note: 'You are a shoreline, not the whole sea. The tide can come and go without taking you with it.',
    },
  };

  /* ---------- the eight birth phases ---------- */
  const BIRTH_PHASES = {
    new: {
      name: 'Born on the New Moon',
      archetype: 'The Initiator',
      text: 'You arrived in the dark, at the beginning of the story. There is a freshness to you that other people can feel — a refusal to accept the inherited version of things. You are here to start, not to polish. Your challenge is trusting that visibility is not a betrayal of your private self.',
      gift: 'Beginning things',
      lesson: 'Let people see what you are building.',
    },
    'waxing-crescent': {
      name: 'Born on the Waxing Crescent',
      archetype: 'The Seeker',
      text: 'You were born with the first sliver of light showing — a person still deciding what they will become. You carry a restlessness that is actually curiosity, and you learn by trying. The work is finishing: your growth comes from staying with one thing past the interesting beginning.',
      gift: 'Learning and adapting',
      lesson: 'Stay for the middle.',
    },
    'first-quarter': {
      name: 'Born on the First Quarter',
      archetype: 'The Builder',
      text: 'You were born at the moment of decision — half light, half dark, and a need to act. You are driven, resilient and occasionally exhausting to be around (especially to yourself). You grow through friction, and you need a challenge or you start inventing one.',
      gift: 'Courage under pressure',
      lesson: 'Not every obstacle is a summons.',
    },
    'waxing-gibbous': {
      name: 'Born on the Waxing Gibbous',
      archetype: 'The Refiner',
      text: 'You arrived almost full, in the phase of analysis and refinement. You see the gap between what a thing is and what it could be, and you feel personally responsible for closing it. Your work is trusting that good enough is a finished state, not a failure of vision.',
      gift: 'Making things excellent',
      lesson: 'Let it be complete, not perfect.',
    },
    full: {
      name: 'Born on the Full Moon',
      archetype: 'The Mirror',
      text: 'You were born in full light and full exposure — an emotional amplifier with a talent for making other people feel seen. You carry a great deal of feeling and an instinct to reflect it back. Your growth is learning the difference between showing up and performing.',
      gift: 'Illuminating what is unspoken',
      lesson: 'You are allowed to be private.',
    },
    'waning-gibbous': {
      name: 'Born on the Waning Gibbous',
      archetype: 'The Messenger',
      text: 'You arrived just after the peak, in the phase of sharing and distilling. You are a natural teacher and editor — you find the meaning and hand it on. Your challenge is believing your own wisdom rather than endlessly giving it away, and letting yourself be the one who needs something.',
      gift: 'Translating experience into meaning',
      lesson: 'Receive as generously as you transmit.',
    },
    'last-quarter': {
      name: 'Born on the Last Quarter',
      archetype: 'The Reformer',
      text: 'You were born at the turning point, when the old form must be broken to make room for the new. You are a person of conviction with a talent for ending what has become false. You grow through release, and your lesson is not to confuse freeing yourself with cutting people off.',
      gift: 'Clearing what is finished',
      lesson: 'End with grief, not only with relief.',
    },
    'waning-crescent': {
      name: 'Born on the Balsamic Moon',
      archetype: 'The Dreamer',
      text: 'You arrived in the last dark of the cycle, carrying the memory of everything before you and an intuition for what comes next. You are deeply imaginative, softly perceptive, and often felt to be from somewhere slightly else. Your work is grounding the vision: giving the dream a body, a budget, a door.',
      gift: 'Vision and foresight',
      lesson: 'Bring it down to earth.',
    },
  };

  /* ---------- compatibility ---------- */

  const ELEMENT_MATRIX = {
    'Fire-Fire': 0.82, 'Fire-Earth': 0.48, 'Fire-Air': 0.96, 'Fire-Water': 0.42,
    'Earth-Earth': 0.88, 'Earth-Water': 0.95, 'Earth-Air': 0.5,
    'Air-Air': 0.82, 'Air-Water': 0.55,
    'Water-Water': 0.9,
  };

  function elementAffinity(a, b) {
    if (a === b) return ELEMENT_MATRIX[a + '-' + a] || 0.8;
    return ELEMENT_MATRIX[a + '-' + b] ?? ELEMENT_MATRIX[b + '-' + a] ?? 0.6;
  }

  const ELEMENT_PAIRS = {
    'Fire-Fire': {
      spark: 'Two people who move toward the heat instead of away from it. Nothing is lukewarm, and the attraction is instant.',
      friction: 'Two speeds of fast, no one assigned to slow down. The same argument can happen for years with new words.',
      advice: 'Take turns being the calm one. Compete in generosity, not in winning.',
    },
    'Fire-Air': {
      spark: 'Air makes fire brighter. You are each other’s favourite audience and most exciting idea — the conversation never runs out.',
      friction: 'One of you will want to leave before the feeling corners you; the other will mistake motion for commitment.',
      advice: 'Make a decision together and let both of you be changed by it.',
    },
    'Fire-Earth': {
      spark: 'You admire each other’s courage and steadiness in exactly the proportion you lack it. This pairing builds things that last when it works.',
      friction: 'One of you thinks the other is reckless; the other thinks the first is slow. Both are a little right.',
      advice: 'Fire needs a hearth, not a cage. Earth needs a reason, not a rush. Give each other the version of security you can actually offer.',
    },
    'Fire-Water': {
      spark: 'The most magnetic mismatch: water cools fire, fire boils water, and neither forgets the other. There is real chemistry here.',
      friction: 'The fire says it too fast; the water feels it too long. Conflict becomes steam if no one puts words to it.',
      advice: 'Name the feeling in plain language before it becomes a flood or a flare.',
    },
    'Earth-Earth': {
      spark: 'Comfort that arrives without explanation. You build a shared reality brick by brick and trust each other to still be there.',
      friction: 'Two people who will not move first. Problems can sit in silence for a very long time.',
      advice: 'Say the hard sentence early. Comfort is not the same thing as closeness.',
    },
    'Earth-Water': {
      spark: 'The classic "makes a home" pairing: one gives shape, the other gives feeling. Tender, durable and deeply nourishing.',
      friction: 'One retreats into worry, the other into work. Both can disappear without announcing it.',
      advice: 'Let the practicality be a form of romance, and let the feeling be a form of strategy.',
    },
    'Earth-Air': {
      spark: 'Head and hands: the dreamer and the builder. There is real mutual respect when you stop dismissing each other’s methods.',
      friction: 'Air finds Earth repetitive; Earth finds Air unreliable. Trust is built only in specifics.',
      advice: 'Turn the big idea into one concrete plan, and honour the plan for a full season.',
    },
    'Air-Air': {
      spark: 'The best conversation of your life. You can talk for hours, and friendship is the floor of the whole thing.',
      friction: 'Nobody is driving, and feelings can stay theoretical for years. Two people avoiding the same awkward moment.',
      advice: 'Put the phone down. Say the vulnerable thing in the room, not in a beautiful message.',
    },
    'Air-Water': {
      spark: 'Air gives the feeling words; water gives the words depth. This is the pairing that can make sense of itself.',
      friction: 'Water feels the distance behind the analysis; Air feels the pressure behind the mood.',
      advice: 'Lead with feeling, follow with meaning. Do not explain the emotion before you honour it.',
    },
    'Water-Water': {
      spark: 'You already understand each other without speaking. The intimacy can be almost psychic.',
      friction: 'Two tides, one riptide. Nobody is holding the shoreline, and feelings can compound into weather.',
      advice: 'One of you must be the container. Take turns, and keep one foot on land.',
    },
  };

  const MATCH_LABELS = {
    twin: { min: 86, label: 'Twin Flame', desc: 'Rare alignment — you will recognise something in each other immediately.' },
    magnetic: { min: 74, label: 'Magnetic', desc: 'Strong pull with real staying power, when the friction is spoken aloud.' },
    slow: { min: 60, label: 'Slow Burn', desc: 'The good kind of work — better as it matures, if you let it.' },
    work: { min: 45, label: 'Work in Progress', desc: 'Different rhythms, real chemistry. Love here is a practice, not a mood.' },
    edge: { min: 0, label: 'Growth Edge', desc: 'This pairing will teach you something. Whether it is meant to last is a separate question.' },
  };

  const MODALITY_LABELS = {
    Cardinal: 'a natural initiating energy',
    Fixed: 'a natural sustaining energy',
    Mutable: 'a natural adapting energy',
  };

  /* ---------- affirmations ---------- */
  const AFFIRMATIONS = [
    'I am allowed to want more than I was told to want.',
    'What is mine does not have to be chased.',
    'I can be soft and still be deliberate.',
    'The love I give returns in a form I am willing to receive.',
    'I trust the timing that is happening to me.',
    'My body is not a project; it is a home.',
    'I release what I have outgrown without needing to punish it.',
    'I make room for the version of me that is still arriving.',
    'Money is energy I have been taught to fear. I learn to use it well.',
    'I do not have to earn the right to rest.',
    'I am becoming someone I would trust with my own heart.',
    'Clarity arrives when I stop asking everyone else.',
    'I choose depth over the performance of depth.',
    'The quiet work counts, even when nobody claps.',
    'I am not behind. I am on my own timeline.',
    'I let pleasure be a practice, not a reward.',
  ];

  /* ---------- relocation destinations ---------- */
  const DESTINATIONS = [
    { city: 'Lisbon', country: 'Portugal', glyph: '✷', element: 'Air', tags: ['Light', 'Ocean', 'Expats', 'Romance'], blurb: 'A city that makes you slower and lighter at once. Its light does something to the nervous system.', season: 'Spring or late September' },
    { city: 'Bali', country: 'Indonesia', glyph: '☾', element: 'Water', tags: ['Spirit', 'Nature', 'Healing', 'Reset'], blurb: 'Less a relocation than a decompression. Good if what you need is to be returned to your own nervous system.', season: 'April to October' },
    { city: 'New York', country: 'USA', glyph: '↯', element: 'Fire', tags: ['Ambition', 'Career', 'Speed', 'Visibility'], blurb: 'A city that will ask you to become legible and then dare you to stay interesting. Ambition with a heartbeat.', season: 'September to November' },
    { city: 'Mexico City', country: 'Mexico', glyph: '✺', element: 'Earth', tags: ['Culture', 'Food', 'Art', 'Intensity'], blurb: 'A place that insists on being felt: colour, food, ghosts, and a social life that happens in the street.', season: 'March to May' },
    { city: 'Berlin', country: 'Germany', glyph: '✧', element: 'Air', tags: ['Freedom', 'Art', 'Night', 'Reinvention'], blurb: 'The city of second acts. Excellent for becoming someone your hometown would not recognise.', season: 'May to September' },
    { city: 'Kyoto', country: 'Japan', glyph: '❀', element: 'Water', tags: ['Beauty', 'Craft', 'Quiet', 'Tradition'], blurb: 'A masterclass in restraint and attention. Good for the part of you that wants to make one thing perfectly.', season: 'Late March or November' },
    { city: 'Cape Town', country: 'South Africa', glyph: '▲', element: 'Earth', tags: ['Nature', 'Ocean', 'Outdoor', 'Contrast'], blurb: 'Mountain and sea in the same frame, with a social rhythm that treats beauty as a civic duty.', season: 'November to March' },
    { city: 'Paris', country: 'France', glyph: '✶', element: 'Air', tags: ['Romance', 'Taste', 'Solitude', 'Art'], blurb: 'The city for becoming your own company. Romance here is often a relationship with a version of yourself.', season: 'Late April to June' },
    { city: 'Reykjavík', country: 'Iceland', glyph: '✦', element: 'Water', tags: ['Stillness', 'Sky', 'Solitude', 'Wonder'], blurb: 'The sky does the talking. Come if you want the volume of your life turned down to hear something underneath.', season: 'September to March for the lights' },
    { city: 'Marrakech', country: 'Morocco', glyph: '☼', element: 'Fire', tags: ['Colour', 'Senses', 'Market', 'Heat'], blurb: 'A full-body education in colour and negotiation. Not restful — but alive in a way that resets your appetite.', season: 'October to April' },
    { city: 'Buenos Aires', country: 'Argentina', glyph: '♪', element: 'Fire', tags: ['Dance', 'Passion', 'Night', 'Friendship'], blurb: 'A city that treats friendship and dancing as infrastructure. Come for the warmth and the late dinners.', season: 'September to November' },
    { city: 'Copenhagen', country: 'Denmark', glyph: '◐', element: 'Air', tags: ['Design', 'Balance', 'Cycling', 'Hygge'], blurb: 'The aesthetic of a well-made life. Good for building routines that feel like care rather than discipline.', season: 'May to August' },
    { city: 'Santorini', country: 'Greece', glyph: '≈', element: 'Water', tags: ['Sea', 'Beauty', 'Romance', 'Retreat'], blurb: 'A honeymoon for your nervous system. Beautiful, and best in the shoulders of the season when it is still yours.', season: 'May or early October' },
    { city: 'Tulum', country: 'Mexico', glyph: '∞', element: 'Water', tags: ['Ocean', 'Ritual', 'Slow', 'Body'], blurb: 'Warm water, cenotes and a town built for bare feet. A good place to remember you have a body.', season: 'November to April' },
    { city: 'Edinburgh', country: 'Scotland', glyph: '◌', element: 'Earth', tags: ['History', 'Mist', 'Books', 'Solitude'], blurb: 'Gothic, literary, walkable. Ideal if the new life you want is quieter and more internal than the old one.', season: 'May to September' },
    { city: 'Singapore', country: 'Singapore', glyph: '◈', element: 'Air', tags: ['Order', 'Career', 'Efficiency', 'Green'], blurb: 'A city that runs like a beautifully maintained machine. Great for a season of focus and compounding.', season: 'February to April' },
    { city: 'Oaxaca', country: 'Mexico', glyph: '✹', element: 'Earth', tags: ['Craft', 'Food', 'Spirit', 'Slow'], blurb: 'A place where making things with your hands is a respectable life plan. Gentle, colourful, deeply rooted.', season: 'October to March' },
    { city: 'Tokyo', country: 'Japan', glyph: '◎', element: 'Air', tags: ['Precision', 'Solo', 'Design', 'Rhythm'], blurb: 'A city that rewards attention and gives you permission to be alone in public. Excellent for a reinvention.', season: 'March to May' },
  ];

  global.DAILY_DATA = {
    DAILY,
    MOON_WEATHER,
    BIRTH_PHASES,
    ELEMENT_PAIRS,
    ELEMENT_MATRIX,
    elementAffinity,
    MATCH_LABELS,
    MODALITY_LABELS,
    AFFIRMATIONS,
    DESTINATIONS,
  };
})(window);
