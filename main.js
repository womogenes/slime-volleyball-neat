console.log('Hello world');

let examples = localStorage.getItem('mnist-examples');
if (!examples) {
  const trainData = await (await fetch('mnist_1k.json')).text();
  console.log('Loaded training data.');
  examples = JSON.parse(trainData).map((x) => ({
    input: x.image,
    output: x.label,
  }));
  localStorage.setItem('mnist-examples', JSON.stringify(examples));

  console.log('Saved examples to localStorage.');
} else {
  console.log('Fetched examples from localStorage.');
  examples = JSON.parse(examples);
}

examples = examples.map((x) => {
  let output = new Array(10).fill(0);
  output[x.output - 1] = 1;
  return {
    input: x.input,
    output,
  };
});
window.examples = examples;

console.log(`${examples.length} examples.`);
console.log(examples[0].input.length, examples[0].output.length);

const network = new neataptic.Network(examples[0].input.length, 10);
window.network = network;
console.log(`Initialized network, evolving...`, network);

/*
some logs: popsize=50, iterations=50, mutationRate=50, 0.09
*/
await network.evolve(examples, {
  mutation: neataptic.methods.mutation.FFW,
  equal: true,
  popsize: 50,
  elitism: 10,
  log: 1,
  error: 0.03,
  iterations: 50,
  mutationRate: 0.5,
});
console.log('Done evolving.');
