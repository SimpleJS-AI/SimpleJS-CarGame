let scripts = [
    'https://cdnjs.cloudflare.com/ajax/libs/mathjs/9.3.2/math.js',
    'simple.js'
]
importScripts(...scripts);


self.addEventListener('message', function(e) {
    let data = e.data;
    if(data.type === 'bp'){
        console.log('Training with backpropagation');
        trainBP(data.trainingTime, data.parameters, data.trainingData);
    }
});



function run(){
    let a = 0;
    for (let i = 0; i < 5000000000; i++) {
        a += i;
    }
    return a;
}

function trainBP(trainingTime, parameters, trainingData){
    postMessage({type: 'trainingStarted'});
    let nn = new NeuralNetwork(...parameters);
    // get current timestamp
    let start = Date.now();
    while(Date.now() - start < trainingTime * 1000){
        for (let i = 0; i < 1000; i++) {
            let data = trainingData[Math.floor(Math.random() * trainingData.length)];
            nn.bp(data.input, data.output);
        }
        console.log('Training');
        // time in percentage that has passed
        let timePassed = (Date.now() - start) / (trainingTime * 1000);
        postMessage({type: 'trainingUpdated', weights: [nn._wInputHidden._data, nn._wHiddenOutput._data], timePercentage: timePassed});
    }

    console.log('Training done');
    postMessage({type: 'trainingDone', weights: [nn._wInputHidden._data, nn._wHiddenOutput._data]});
}
