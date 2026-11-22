// Levels. Answers are checked by test/levels.test.mjs against the exact algorithms in core.js.
import { gridGraph } from './core.js';

const PAIRS = {
  unit: ['pair', 'pairs'], sense: 'max', kind: 'pairs',
  question: 'How many pairs can dance at once?',
  labels: { build: 'Make pairs', bound: 'Prove: at most…' },
  howBuild: 'Click a line to pair those two people (it turns gold); click it again to undo. Pairing someone who already has a partner breaks up their old pair.',
  howBound: 'Mark people so that <b>every line touches a marked person</b>. Then there can be no more pairs than marks: every pair is a line, so it contains a marked person, and nobody dances in two pairs.',
};
const DOMINO = {
  unit: ['domino', 'dominoes'], sense: 'max', kind: 'grid',
  question: 'How many dominoes fit on the board?',
  labels: { build: 'Lay dominoes', bound: 'Prove: at most…' },
  howBuild: 'Tap a square, then a square next to it, to lay a domino. Tap a domino to lift it. Dark squares are holes.',
  howBound: 'Mark squares so that <b>every two neighbouring squares include a marked one</b>. A domino always covers two neighbours, so it covers a mark, and no two dominoes share a square: no more dominoes than marks.',
};
const PIPES = {
  unit: ['unit', 'units'], sense: 'max', kind: 'pipes',
  question: 'How much water can flow from IN to OUT?',
  labels: { build: 'Send water', bound: 'Prove: at most…' },
  howBuild: 'Click junctions from IN along the arrows to OUT to send one unit along that route. Each pipe carries at most its number. Use − and + on a route to change how much it carries.',
  howBound: 'Close pipes (click them) until <b>no water can get from IN to OUT</b>. Every unit of water has to pass through a closed pipe, so the flow is at most the total of the closed pipes\' numbers.',
};
const BOXES = {
  unit: ['stack', 'stacks'], sense: 'min', kind: 'boxes',
  question: 'How few stacks can hold all the boxes?',
  labels: { build: 'Make stacks', bound: 'Prove: at least…' },
  howBuild: 'In a stack, each box fits inside the next one: narrower <i>and</i> lower. Pick a stack colour, then click box corners to put them in it. A box in no stack counts as a stack of its own.',
  howBound: 'Mark boxes so that <b>no marked box fits inside another marked box</b>. No two of them can share a stack, so you need at least as many stacks as marks.',
};

/** Layered positions for pipe networks: IN, then each layer top to bottom, then OUT. */
function layered(layers) {
  const L = layers.length + 2, pos = [[0, 0.5]];
  layers.forEach((k, l) => { for (let i = 0; i < k; i++) pos.push([(l + 1) / (L - 1), k === 1 ? 0.5 : i / (k - 1)]); });
  pos.push([1, 0.5]);
  return pos;
}

const RAW = [
  // ---- Pairs (König: most pairs = fewest people touching every line)
  { ...PAIRS, id: 'p1', chapter: 'Pairs', title: 'Two left feet',
    setup: 'Each line joins two people, one from each row, who would happily dance together. A pair is one line, and nobody can be in two pairs.',
    top: 3, bottom: 3, edges: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
    hint: 'A and B each have only one possible partner. Is it the same person?',
    why: 'A and B both need 1, so one of them sits out. Marking 1 and C touches every line, so no plan has 3 pairs.' },
  { ...PAIRS, id: 'p2', chapter: 'Pairs', title: 'Popular',
    setup: 'The same rule: one line per pair, nobody in two pairs. Your proof can mix people from both rows.',
    top: 4, bottom: 4, edges: [[0, 0], [0, 1], [1, 0], [2, 0], [2, 1], [2, 2], [2, 3], [3, 0]],
    hint: 'Who are A and B hoping to dance with? And who is the only person 3 and 4 can dance with?',
    why: 'A and B both need 1, and D is the only partner for 3 and 4. The proof has to mix the rows (1, C and D works): marking a whole row would take all four people.' },
  { ...PAIRS, id: 'p3', chapter: 'Pairs', title: 'Crowded floor',
    setup: 'Six and six. A first plan usually gets stuck one pair short. When it does, look for a chain: a pair you can break up so both people find someone new.',
    top: 6, bottom: 6, edges: [[0, 1], [0, 3], [1, 1], [1, 3], [2, 0], [2, 1], [2, 3], [2, 4], [3, 0], [3, 2], [3, 3], [3, 4], [3, 5], [4, 1], [4, 3], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5]],
    hint: 'Look at A, B and C. Who can they dance with?',
    why: 'A, B and C can only dance with 1 and 2, so one of the three sits out. Marking 1 and 2 touches all their lines, and D, E and F touch the rest: 5 marks, so at most 5 pairs.' },
  { ...PAIRS, id: 'p4', chapter: 'Pairs', title: 'Seven and seven',
    setup: 'A bigger class. If you\'re stuck below what your proof says, try breaking a pair to make room: the person freed may have another partner.',
    top: 7, bottom: 7, edges: [[0, 0], [0, 3], [0, 4], [1, 1], [1, 3], [2, 1], [2, 3], [2, 4], [3, 0], [3, 2], [3, 3], [3, 5], [3, 6], [4, 2], [4, 3], [4, 5], [4, 6], [5, 1], [5, 3], [5, 4], [6, 1], [6, 3], [6, 4]],
    hint: 'Four people in the top row are choosing among the same three partners.',
    why: 'A, B, C and D can only dance with 1, 2 and 3, so one of the four sits out. Those three plus E, F and G touch every line. König proved in 1931 that for two rows like these, a proof that meets the best answer always exists.' },

  // ---- Dominoes (the same theorem on a board)
  { ...DOMINO, id: 'd1', chapter: 'Dominoes', title: 'Missing corners',
    setup: 'Dominoes cover two squares side by side (not diagonally) and can\'t overlap or cover holes.',
    rows: ['#...', '....', '....', '...#'], shortcuts: false,
    hint: 'The two holes are both dark squares. Every domino covers one dark and one light square.',
    why: 'Each domino covers one light square and one dark one. With two dark squares gone there are 8 light but only 6 dark squares, and marking the 6 dark squares proves it. This is the old chessboard puzzle in miniature.' },
  { ...DOMINO, id: 'd2', chapter: 'Dominoes', title: 'Pockets',
    setup: 'Same rules. A proof can mix dark and light squares.',
    rows: ['....#.', '#..#..', '....#.', '......', '.....#', '..#...'],
    hint: 'Look at the top right corner. Which squares there have only one free neighbour?',
    why: 'Two squares at the top right have only one free neighbour, and it\'s the same square, so one of them stays empty. Marking that shared neighbour handles both; the rest of the proof follows the colours.' },
  { ...DOMINO, id: 'd3', chapter: 'Dominoes', title: 'Balanced',
    setup: 'This time the board has as many dark squares as light ones, so the colour trick alone won\'t prove anything.',
    rows: ['......', '......', '##....', '.#....', '...#.#', '...#..'],
    hint: 'Look at the bottom left corner. Count the light squares there and the squares next to them.',
    why: 'Four light squares in the bottom left have only three free neighbours between them, so one stays empty. Mark those three neighbours, and the light squares everywhere else.' },
  { ...DOMINO, id: 'd4', chapter: 'Dominoes', title: 'Scattered',
    setup: 'The last board in this chapter.',
    rows: ['..#...', '.#....', '.#..##', '#..#..', '.....#', '......'],
    hint: 'Look at the top of the board, around the holes in the first two rows.',
    why: 'Five squares at the top have only four free neighbours between them. Covering a board with dominoes is the same problem as pairing dancers (squares are people, neighbours are lines), so König\'s theorem applies here too: a proof that meets the best answer always exists.' },

  // ---- Pipes (max flow = min cut)
  { ...PIPES, id: 'w1', chapter: 'Pipes', title: 'The narrow middle',
    setup: 'Water runs one way along each pipe, in the direction of its arrow. A pipe\'s number is how many units it carries at most. Junctions don\'t store water.',
    pos: layered([2, 1]), edges: [[0, 1, 3], [0, 2, 3], [1, 3, 2], [2, 3, 2], [3, 4, 5]],
    hint: 'Count what can reach the junction in the middle.',
    why: 'Plenty of water leaves IN and plenty could enter OUT, but everything passes through the two pipes in the middle, which carry 2 + 2.' },
  { ...PIPES, id: 'w2', chapter: 'Pipes', title: 'Crosswise',
    setup: 'Some pipes connect junctions in the same column. Mind their arrows.',
    pos: layered([2, 2]), edges: [[0, 1, 5], [0, 2, 2], [1, 4, 3], [2, 3, 3], [2, 4, 1], [3, 5, 4], [4, 5, 3], [3, 4, 1]],
    hint: 'The closed pipes don\'t have to be in one column. Try a cut that zig-zags.',
    why: 'The best cut isn\'t a straight line across the map: it takes whichever pipes are narrowest on the way. Max flow equals min cut (Ford and Fulkerson, 1956): the proof always exists.' },
  { ...PIPES, id: 'w3', chapter: 'Pipes', title: 'Detours',
    setup: 'A bigger network. If your water gets stuck, take a unit off a route and send it a different way.',
    pos: layered([3, 3]), edges: [[0, 1, 3], [0, 2, 3], [0, 3, 4], [1, 5, 4], [2, 5, 2], [2, 6, 3], [3, 4, 3], [4, 7, 4], [5, 7, 1], [6, 7, 5], [2, 1, 1], [2, 3, 3]],
    hint: 'Which pipes into OUT are narrow, and which junctions can feed the wide ones?',
    why: 'The proof shows where the network really pinches, and it doesn\'t have to be the pipes next to IN or OUT.' },
  { ...PIPES, id: 'w4', chapter: 'Pipes', title: 'Waterworks',
    setup: 'Three columns of junctions.',
    pos: layered([3, 3, 3]), aspect: 0.6, edges: [[0, 1, 5], [0, 2, 4], [0, 3, 1], [1, 4, 3], [1, 5, 3], [1, 6, 1], [2, 4, 3], [2, 5, 4], [3, 4, 4], [3, 5, 5], [3, 6, 5], [4, 9, 4], [5, 7, 2], [5, 9, 4], [6, 7, 2], [6, 8, 1], [7, 10, 3], [8, 10, 3], [9, 10, 2], [8, 9, 2]],
    hint: 'Follow the water backwards from OUT: what can feed each pipe into OUT?',
    why: 'You found a set of pipes that every drop must cross, adding up to exactly what you sent.' },

  // ---- Boxes (Dilworth: fewest stacks = most boxes no two of which fit together)
  { ...BOXES, id: 'b1', chapter: 'Boxes', title: 'Nesting',
    setup: 'Every box is drawn from the same corner, so box P fits inside box Q exactly when P\'s far corner is inside Q. Boxes can\'t turn.',
    boxes: [[2, 3], [5, 6], [8, 9], [4, 10], [10, 2]], size: 11, stacks: 4,
    hint: 'Two of the boxes are long and thin in different directions.',
    why: 'Three boxes don\'t fit in one another, so they need three different stacks, and three stacks are enough.' },
  { ...BOXES, id: 'b2', chapter: 'Boxes', title: 'Staircase',
    setup: 'A box in no stack counts as a stack of its own.',
    boxes: [[9, 1], [6, 11], [12, 8], [5, 3], [3, 7], [4, 12], [8, 9], [2, 6], [7, 2]], size: 13, stacks: 5,
    hint: 'Boxes that don\'t fit in each other form a staircase going down to the right.',
    why: 'Boxes whose corners form a staircase going down and to the right never fit inside one another. The longest such staircase is the proof.' },
  { ...BOXES, id: 'b3', chapter: 'Boxes', title: 'Eleven boxes',
    setup: 'More boxes, same question.',
    boxes: [[2, 3], [4, 12], [7, 8], [9, 5], [6, 2], [10, 7], [3, 6], [12, 4], [1, 11], [11, 1], [5, 13]], size: 14, stacks: 6,
    hint: 'Start your stacks from the smallest boxes and grow them up and to the right.',
    why: 'Dilworth (1950): the fewest stacks always equals the most boxes that pairwise don\'t fit. Again, a proof always exists.' },
  { ...BOXES, id: 'b4', chapter: 'Boxes', title: 'The warehouse',
    setup: 'Thirteen boxes.',
    boxes: [[8, 5], [5, 4], [9, 13], [2, 8], [1, 7], [10, 2], [7, 3], [6, 9], [11, 11], [3, 14], [13, 10], [12, 12], [14, 1]], size: 15, stacks: 6,
    hint: 'Look for the longest staircase down and to the right.',
    why: 'Every stack climbs up and to the right; every staircase of marks goes down and to the right. A stack can use at most one step of the staircase.' },
];

export const LEVELS = RAW.map(lv => ({ ...lv, trivial: trivialBound(lv) }));

/** The bound a player gets for free, shown before they've built a proof. */
export function trivialBound(lv) {
  if (lv.kind === 'pairs') return { value: Math.min(lv.top, lv.bottom), low: 0, text: 'each row has ' + Math.min(lv.top, lv.bottom) + (lv.top === lv.bottom ? ' people' : ' or more people') };
  if (lv.kind === 'grid') { const c = gridGraph(lv.rows).cells.length; return { value: Math.floor(c / 2), low: 0, text: `${c} squares` }; }
  if (lv.kind === 'pipes') {
    const out = lv.edges.filter(e => e[0] === 0).reduce((a, e) => a + e[2], 0), t = lv.pos.length - 1, inn = lv.edges.filter(e => e[1] === t).reduce((a, e) => a + e[2], 0);
    return { value: Math.min(out, inn), low: 0, text: out <= inn ? 'what leaves IN' : 'what enters OUT' };
  }
  return { value: lv.boxes.length, low: 1, text: '' };
}
