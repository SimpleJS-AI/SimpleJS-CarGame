//let math = typeof window !== 'undefined' ? window.math : require('mathjs');

/**
 * Neural Network based on the Backpropagation algorithm
 * @class
 * @param {number} input - Number of input neurons
 * @param {number} hidden - Number of hidden neurons
 * @param {number} output - Number of output neurons
 * @param {number} [lr=0.1] - Learning rate
 */
class NeuralNetwork {
    constructor(input, hidden, output, lr = 0.1) {
        this.input = input;
        this.hidden = hidden;
        this.output = output;

        this.lr = lr;

        this._wInputHidden = math.zeros(this.hidden, this.input+1);
        this._wInputHidden = math.map(this._wInputHidden, () => Math.random() * 2 - 1);
        this._wHiddenOutput = math.zeros(this.output, this.hidden+1);
        this._wHiddenOutput = math.map(this._wHiddenOutput, () => Math.random() * 2 - 1);

        /*this.b_hidden = math.map(math.zeros(this.hidden), () => Math.random() * 2 - 1);
        this.b_output = math.map(math.zeros(this.output), () => Math.random() * 2 - 1);*/
        this._bHidden = 1;//Math.random() * 2 - 1;
        this._bOutput = 1;//Math.random() * 2 - 1;
    }

    /**
     * Activation function
     * @param {number} x - Input value
     * @returns {number}
     * @private
     */
    _activation(x) {
        return 1 / (1 + Math.exp(-x));
    }

    /**
     * Derivative of the activation function
     * @param {number} x - Input value
     * @returns {number}
     * @private
     */
    _dActivation(x) {
        return x * (1 - x);
    }

    /**
     * Feedforward Algorithm
     * @param {Array} input - Input array
     * @param {Boolean} [debug=false] - Debug mode
     * @returns {Array} output - Output array
     */
    ff(input, debug = false) {
        if(input.length !== this.input) return false;
        input.push(this._bHidden);
        let inputMatrix = math.matrix(input);
        let hiddenMatrix = math.multiply(inputMatrix, math.transpose(this._wInputHidden));
        hiddenMatrix = math.map(hiddenMatrix, this._activation);
        hiddenMatrix = math.concat(hiddenMatrix, [this._bOutput]);  //Concat: add bias [1,2] + [3] = [1,2,3]
        let outputMatrix = math.multiply(hiddenMatrix, math.transpose(this._wHiddenOutput));
        outputMatrix = math.map(outputMatrix, this._activation);
        return debug ? [inputMatrix,hiddenMatrix,outputMatrix] : outputMatrix.toArray();
    }

    /**
     * Backpropagation Algorithm
     * @param {Array} desired_input - Input array
     * @param {Array} desired - Desired output array
     * @returns {(*[]|number[][]|[number[]]|*)[]|boolean}
     */
    bp(desired_input, desired) {
        let input = [...desired_input];  //Copy array
        if(desired_input.length !== this.input || desired.length !== this.output) return false;
        let [inputMatrix, hiddenMatrix, outputMatrix] = this.ff(input, true);
        let e_output = math.subtract(desired, outputMatrix);
        let g_output = math.map(outputMatrix, this._dActivation);
        g_output = math.dotMultiply(g_output, e_output);
        let g_hidden = math.map(hiddenMatrix, this._dActivation);
        g_hidden._data.pop();
        g_hidden._size[0]--;
        g_hidden = math.dotMultiply(g_hidden, math.multiply(g_output, math.subset(this._wHiddenOutput, math.index(math.range(0, this._wHiddenOutput.size()[0]), math.range(0, this._wHiddenOutput.size()[1]-1)))));
        let d_output = math.multiply(math.transpose(math.matrix([g_output._data])), math.matrix([hiddenMatrix._data]));
        d_output = math.dotMultiply(d_output, this.lr);
        let d_hidden = math.multiply(math.transpose(math.matrix([g_hidden._data])), math.matrix([inputMatrix._data]));
        d_hidden = math.dotMultiply(d_hidden, this.lr);
        this._wHiddenOutput = math.add(this._wHiddenOutput, d_output);
        this._wInputHidden = math.add(this._wInputHidden, d_hidden);
        return [input, outputMatrix._data, e_output._data];

    }
}


/**
 * Genetic Algorithm
 * @class
 * @param {number} populationSize - Number of individuals in the population
 * @param {number} nnInput - Number of input neurons
 * @param {number} nnHidden - Number of hidden neurons
 * @param {number} nnOutput - Number of output neurons
 * @param {number} [nnLr=0.1] - Learning rate
 * @param {Object} objClass - Class of the object to be optimized
 * @param args - Arguments for the object
 */
class GeneticAlgorithm {
    constructor(populationSize, nnInput, nnHidden, nnOutput, nnLr = 0.1, objClass, ...args) {
        this.populationSize = populationSize;
        this.population = [];
        this.threshold = 0.8;
        this.gaLr = nnLr;
        for (let i = 0; i < this.populationSize; i++) {
            this.population.push(new Individual(nnInput, nnHidden, nnOutput, nnLr, objClass, ...args));
        }
    }

    /**
     * set the Threshold
     * @param {number} threshold - Threshold value
     */
    setThreshold(threshold){
        this.threshold = threshold;
    }

    /**
     * set the Learning Rate
     * @param {number} lr - Learning rate
     */
    setLr(lr){
        this.gaLr = lr;
    }

    /**
     * get the object of the individual at index
     * @param {number} index - Index of the individual
     * @returns {*}
     */
    get(index) {
        return this.population[index].obj;
    }

    /**
     * get the fittest individual
     * @returns {*}
     */
    getFittest() {
        let fittest = this.population[0];
        for (let i = 1; i < this.populationSize; i++) {
            if (this.population[i].fitness > fittest.fitness) fittest = this.population[i];
        }
        return fittest;
    }

    /**
     * apply a function to each individual
     * @param {function} func - Function to apply
     */
    forEach(func) {
        this.population.forEach(individual => func(individual.obj));
    }

    /**
     * evolve the population
     * @param {number} [newSize=this.populationSize] - New population size
     */
    evolve(newSize = this.populationSize) {
        let newPopulation;
        newPopulation = this._selection(this.population);
        newPopulation = this._crossover(newPopulation, newSize);
        newPopulation = this._mutate(newPopulation);
        this.population = newPopulation;
        this.populationSize = this.population.length;
    }

    /**
     * Selection Algorithm
     * @param population
     * @returns {*[]}
     * @private
     */
    _selection(population) {
        let newPopulation = [];
        let fittest = this.getFittest();
        newPopulation.push(fittest);
        let threshold = fittest.fitness * this.threshold;
        for (let i = 0; i < population.length; i++) {
            if (population[i].fitness >= threshold) {
                newPopulation.push(population[i]);
            }
        }
        return newPopulation;
    }

    /**
     * Crossover Algorithm
     * @param population
     * @param newSize
     * @returns {*[]}
     * @private
     */
    _crossover(population, newSize) {
        let newPopulation = [];
        while(newPopulation.length > newSize + .5){
            newPopulation.push(population[math.floor(Math.random() * population.length - 1 ) + 1]);   //exclude fittest -> index 0
        }
        while(newPopulation.length < newSize){
            let p1 = population[math.floor(Math.random() * population.length)];
            let p2 = population[math.floor(Math.random() * population.length)];
            let child = new Individual(p1.nn.input, p1.nn.hidden, p1.nn.output, p1.nn.lr, p1.objClass, ...p1.args);
            for(let i = 0; i < child.nn._wInputHidden.size()[0]; i++){
                for(let j = 0; j < child.nn._wInputHidden.size()[1]; j++){
                    child.nn._wInputHidden._data[i][j] = Math.random() > .5 ? p2.nn._wInputHidden._data[i][j] : p1.nn._wInputHidden._data[i][j];
                }
            }
            for(let i = 0; i < child.nn._wHiddenOutput.size()[0]; i++){
                for(let j = 0; j < child.nn._wHiddenOutput.size()[1]; j++){
                    child.nn._wHiddenOutput._data[i][j] = Math.random() > .5 ? p2.nn._wHiddenOutput._data[i][j] : p1.nn._wHiddenOutput._data[i][j];
                }
            }
            delete p1.obj
            delete p2.obj;
            newPopulation.push(child);
        }
        return newPopulation;
    }

    /**
     * Mutation Algorithm
     * @param population
     * @returns {*}
     * @private
     */
    _mutate(population) {
        for (let i = 1; i < population.length-1; i++) {
            for (let j = 0; j < population[i].nn._wInputHidden.size()[0]; j++) {
                for (let k = 0; k < population[i].nn._wInputHidden.size()[1]; k++) {
                    if (Math.random() < this.gaLr) population[i].nn._wInputHidden._data[j][k] = Math.random() * 2 - 1;
                }
            }
            for (let j = 0; j < population[i].nn._wHiddenOutput.size()[0]; j++) {
                for (let k = 0; k < population[i].nn._wHiddenOutput.size()[1]; k++) {
                    if (Math.random() < this.gaLr) population[i].nn._wHiddenOutput._data[j][k] = Math.random() * 2 - 1;
                }
            }
        }
        return population;
    }
}

/**
 * Individual
 * @class
 * @param {number} nnInput - Number of input neurons
 * @param {number} nnHidden - Number of hidden neurons
 * @param {number} nnOutput - Number of output neurons
 * @param {number} nnLR - Learning rate
 * @param {Object} objClass - Class of the object to be optimized
 * @param args - Arguments for the object
 */
class Individual {
    constructor(nnInput, nnHidden, nnOutput, nnLR, objClass, ...args) {
        this.objClass = objClass;
        this.args = args;
        this.nn = new NeuralNetwork(nnInput, nnHidden, nnOutput, nnLR);
        this.fitness = 0;
        this.obj = new objClass(this,...this.args);
    }

    /**
     * Set the fitness value
     * @param {number} fitnessValue - Fitness value
     */
    setFitness(fitnessValue){
        this.fitness = fitnessValue;
    }

    /**
     * Get the fitness value
     * @returns {number} - Fitness value
     */
    getFitness(){
        return this.fitness;
    }

    /**
     * Get the object
     * @returns {*} - Object
     */
    getObj(){
        return this.obj;
    }

    /**
     * Set the object
     * @param {*} obj - Object
     */
    setObj(obj){
        this.obj = obj;
    }
}


if(typeof window !== 'undefined') {
    window.NeuralNetwork = NeuralNetwork;
    window.GeneticAlgorithm = GeneticAlgorithm;
    window.Individual = Individual;
}

