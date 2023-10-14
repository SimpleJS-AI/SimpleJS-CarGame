

let colors = ['#dabfff','#2c2a4a','#4f518c','#907ad6','#fff'];

// *******
// CLASSES
// *******

let trainingData = [];
class TrainingData{
    constructor(input, output){
        this.input = input;
        this.output = output;
    }
    isEqual(other){
        if(this.input.length === other.input.length && this.output.length === other.output.length){
            if(this.input.every((x,i) => x === other.input[i]) && this.output.every((x,i) => x === other.output[i])){
                return true;
            }
        }
        return false;
    }
}
class Car {
    constructor(individual, manual = false){
        this.manual = manual;
        this.individual = individual;
        this.x = wpos(10);
        this.y = wpos(19);
        this.z = 0;
        this.speed = 0;
        this.steeringAngle = 0;
        this.failed = false;
        this.mesh = new THREE.Group();
        this.mesh.add(carMesh.clone());
        this.mesh.position.set(this.x,this.y,this.z);
        this.mesh.rotation.set(0,0,Math.PI);
        scene.add(this.mesh);
        this.acceleration = false;
        this.deceleration = false;
        this.speedFailCounter = 0;
        this.checkpoint = 0;
        this.reachedFinish = false;

        this.raycaster0 = new THREE.Raycaster(undefined, undefined, 0, 10);

        this.raycaster = [];
        this.raycasterData = [];
        this.raycasterHelper = [];
        for (let i = 0; i < 9; i++){
            this.raycaster.push(new THREE.Raycaster(undefined, undefined, 0, 200));
            this.raycasterHelper[i] = new THREE.ArrowHelper(undefined, undefined, 0, 0xff0000, 0 , 0);
            this.raycasterHelper[i].position.z = 10;
            this.raycasterHelper[i].cone.visible = false;
            scene.add(this.raycasterHelper[i]);
        }
    }
    respawn(){
        if(!this.failed) {
            this.mesh.position.set(wpos(10), wpos(19), 0);
            this.mesh.rotation.set(0, 0, Math.PI);
        }
    }
    draw(){
        if(!this.failed) {
            this.direction = new THREE.Vector3(1, 0, 0);
            this.direction.applyQuaternion(this.mesh.quaternion);   //make direction relative to rotation
            this.x += this.speed;
            this.mesh.position.add(this.direction.multiplyScalar(this.speed));
            this.mesh.rotation.z += this.speed * .025 * this.steeringAngle;
            if (this.acceleration && this.speed < (this.manual ? .5 : 2) ) {
                this.speed += this.manual ? .01 : .05;
            } else if (this.speed > 0) {
                if (this.deceleration) {
                    this.speed -= .05;
                }
                this.speed -= .01;
            } else {
                this.speed = 0;
            }
            if(!this.manual) {
                this.individual.fitness += this.speed;
            }
            //animation
            this.mesh.children[0].rotation.x = Math.PI / 2 + Math.sin(this.steeringAngle * this.speed * .1);

            //raycaster
            this.updateRaycaster();
            //this.visualizeRaycaster();

            //checkpoints
            this.checkCheckpoint();

            //NN
            if(!this.manual) {
                let nnInput = this.raycasterData;
                let nnOutput = this.individual.nn.ff(nnInput);
                this.steeringAngle = nnOutput[0] * 4 - 2;
                if (nnOutput[1] > .5) {
                    this.acceleration = true;
                    this.deceleration = false;
                } else {
                    this.acceleration = false;
                    this.deceleration = true;
                }
            }else if(nextPhase === 1){
                let data = new TrainingData(this.raycasterData, [this.steeringAngle / 4 + 0.5, this.acceleration ? 1 : 0])
                if(trainingData.length === 0){
                    trainingData.push(data);
                } else if(!trainingData[trainingData.length - 1].isEqual(data)){
                    trainingData.push(data);
                }
            }

            //collision
            this.checkFailed()
        }else if(this.mesh != null){
            removeObjWithChildren(this.mesh);
            scene.remove(this.mesh);
            this.mesh = null;
        }
    }
    checkFailed(){
        let failed = false;
        if(!this.manual) {
            if (this.speed === 0) this.speedFailCounter++;
            if (this.speedFailCounter > 100) failed = true;
        }
        for(let i = 0; i < this.raycaster.length; i++){
            if(this.raycasterData[i] < .02){
                failed = true;
            }
        }
        if(failed){
            this.updateRaycaster();
            if(this.manual){
                this.mesh.position.set(wpos(10),wpos(19),0);
                this.mesh.rotation.set(0,0,Math.PI);
                trainingData = [];
                return;
            }
            this.failed = true;
            failedCounter++;
        }
    }
    updateRaycaster(){
        this.raycasterData = [];
        for(let i = 0; i < this.raycaster.length; i++){
            this.raycaster[i].set(
                this.mesh.position,
                new THREE.Vector3(1,0,0)
                    .applyQuaternion(this.mesh.quaternion)
                    .applyQuaternion(new THREE.Quaternion()
                        .setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.PI/2+i*Math.PI/8)
                    )
            );
            let array = w.concat(walls);
            let intersections = this.raycaster[i].intersectObjects(array.map(w => w.mesh));
            this.raycasterData[i] = intersections.length > 0 ? Math.floor(intersections[0].distance): 200;

        }
        this.raycasterData = this.raycasterData.map(x => x/200);
    }
    visualizeRaycaster(){
        for(let i = 0; i < this.raycasterHelper.length; i++){
            this.raycasterHelper[i].position.copy(this.raycaster[i].ray.origin);
            this.raycasterHelper[i].position.z = 10;
            this.raycasterHelper[i].setLength(200);
            this.raycasterHelper[i].setDirection(this.raycaster[i].ray.direction);
        }
    }
    setColor(color){
        //this.mesh.children[0].children[0].children[3].material.color.set(color);
        //this.mesh.children[0].children[0].children[3].material = this.material;
        this.mesh.children[0].children[0].children[3].material = new THREE.MeshToonMaterial({color: color, gradientMap: fiveTone });
    }

    //checkpoints
    checkCheckpoint(){
        for(let i = 0; i < checkpointBoundingBoxes.length; i++){
            if(checkpointBoundingBoxes[i].containsPoint(this.mesh.position)){
                this.bypassedCheckpoint(i);
            }
        }
    }
    bypassedCheckpoint(index){
        if(this.checkpoint === checkpoints.length){
            this.checkpoint = 0;
            this.reachedFinish = true;
            if(!this.manual){
                this.individual.fitness += 5000 * finishPoints;
                finishPoints--;
                failedCounter++;
            }
        }
        if(this.checkpoint === index){
            this.checkpoint++;
            if(!this.manual){
                this.individual.fitness += 1000;
            }
            else{
                setProgressValue(this.checkpoint*(200/checkpoints.length));
            }
            console.log(this.checkpoint + " Checkpoint reached");
        }
    }
}
let finishPoints = 20;



// ***********
// WALLS SETUP
// ***********

let buildMode = false;
let walls = [];
class Wall {
    constructor(x1,y1,x2,y2, border = false){
        this.x1 = wpos(x1);
        this.y1 = wpos(y1);
        this.x2 = wpos(x2);
        this.y2 = wpos(y2);
        this.p1 = new THREE.Vector3(this.x1,this.y1,0);
        this.p2 = new THREE.Vector3(this.x2,this.y2,0);
        this.material = new THREE.MeshLambertMaterial({color: colors[2]});
        if(border){
            this.material.color.set(colors[3]);
        }
        this.geometry = new THREE.BoxGeometry(this.p1.distanceTo(this.p2), 5,5);
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.set((this.x1+this.x2)/2,(this.y1+this.y2)/2,0);
        this.mesh.rotation.z = Math.atan2(this.y2-this.y1,this.x2-this.x1);
        this.mesh = new THREE.Group().add(this.mesh);
        let cGeometry = new THREE.CylinderGeometry( 2.5, 2.5, 5, 32 );
        let c1 = new THREE.Mesh(cGeometry, this.material);
        let c2 = new THREE.Mesh(cGeometry, this.material);
        c1.position.set(this.x1,this.y1,0);
        c2.position.set(this.x2,this.y2,0);
        c1.rotation.x = Math.PI/2;
        c2.rotation.x = Math.PI/2;
        this.mesh.add(c1);
        this.mesh.add(c2);
        scene.add(this.mesh);
    }
}

class Checkpoint{
    constructor(x1,y1,x2,y2,index){
        this.x1 = wpos(x1);
        this.y1 = wpos(y1);
        this.x2 = wpos(x2);
        this.y2 = wpos(y2);
        this.index = index;
        this.p1 = new THREE.Vector3(this.x1,this.y1,0);
        this.p2 = new THREE.Vector3(this.x2,this.y2,0);
        this.material = new THREE.MeshLambertMaterial({color: colors[3]});
        this.geometry = new THREE.BoxGeometry(this.p1.distanceTo(this.p2), 5,4);
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.set((this.x1+this.x2)/2,(this.y1+this.y2)/2,0);
        this.mesh.rotation.z = Math.atan2(this.y2-this.y1,this.x2-this.x1);
        scene.add(this.mesh);
        this.showIndex();
    }
    showIndex(){
        let text = document.createElement('div');
        text.style.position = 'absolute';
        text.className = "checkpoint-index";
        text.innerHTML = this.index+1;
        let pos1 = to2D(this.p1);
        let pos2 = to2D(this.p2);
        text.style.top = (pos1.y + pos2.y)/2 + "px";
        text.style.left = (pos1.x + pos2.x)/2 + "px";
        text.style.transform = "translate(-50%, -50%)";
        text.style.backgroundColor = colors[0];
        text.style.width = "16px";
        text.style.height = "20px";
        text.style.textAlign = "center";
        document.body.appendChild(text);
    }
    setAsFinish(){
        this.material.color.set(colors[4]);
    }
    unsetAsFinish(){
        this.material.color.set(colors[3]);
    }
}

function updateCheckpointIndex(){
    document.querySelectorAll(".checkpoint-index").forEach(x => x.remove());
    for(const checkpoint of checkpoints){
        checkpoint.showIndex();
    }
}

function to2D(pos) {
    let vector = pos.clone().project(camera);
    vector.x = (vector.x + 1) / 2 * window.innerWidth;
    vector.y = -(vector.y - 1) / 2 * window.innerHeight;
    return vector;
}

let checkpoints = [];
let checkpointBoundingBoxes = [];
function addCheckpoint(x1,y1,x2,y2){
    checkpoints.push(new Checkpoint(x1,y1,x2,y2,checkpoints.length));
    checkpoints[checkpoints.length - 1].setAsFinish();
    if(checkpoints.length > 1){
        checkpoints[checkpoints.length - 2].unsetAsFinish();
    }
    checkpointBoundingBoxes.push(new THREE.Box3().setFromObject(checkpoints[checkpoints.length - 1].mesh));
}


function addTemplateWalls(){
    /*walls.push(new Wall(6,20,0,14));
    walls.push(new Wall(0,14,0,6));
    walls.push(new Wall(0,6,6,0));
    walls.push(new Wall(6,0,14,0));
    walls.push(new Wall(14,0,14,6));
    walls.push(new Wall(14,6,20,6));
    walls.push(new Wall(20,6,20,14));
    walls.push(new Wall(20,14,14,20));
    walls.push(new Wall(14,20,6,20));

    walls.push(new Wall(8,17,3,12));
    walls.push(new Wall(3,12,3,8));
    walls.push(new Wall(3,8,8,3));
    walls.push(new Wall(8,3,8,7));
    walls.push(new Wall(8,7,13,12));
    walls.push(new Wall(13,12,17,12));
    walls.push(new Wall(17,12,12,17));
    walls.push(new Wall(12,17,8,17));

    addCheckpoint(0,10,3,10);
    addCheckpoint(6,0,8,3);
    addCheckpoint(17,12,20,12);
    addCheckpoint(12,17,12,20);*/

    walls.push(new Wall(20,20,6,20));
    walls.push(new Wall(6,20,2,12));
    walls.push(new Wall(2,12,2,3));
    walls.push(new Wall(2,3,6,0));
    walls.push(new Wall(6,0,9,2));
    walls.push(new Wall(9,2,12,0));
    walls.push(new Wall(12,0,15,3));
    walls.push(new Wall(15,3,19,2));
    walls.push(new Wall(19,2,20,4));
    walls.push(new Wall(20,4,20,11));
    walls.push(new Wall(20,11,15,12));
    walls.push(new Wall(15,12,20,15));
    walls.push(new Wall(20,15,20,20));

    walls.push(new Wall(13,17,7,17));
    walls.push(new Wall(7,17,5,15));
    walls.push(new Wall(5,15,4,9));
    walls.push(new Wall(4,9,4,6));
    walls.push(new Wall(4,6,6,3));
    walls.push(new Wall(6,3,9,5));
    walls.push(new Wall(9,5,12,4));
    walls.push(new Wall(12,4,15,5));
    walls.push(new Wall(15,5,18,5));
    walls.push(new Wall(18,5,18,8));
    walls.push(new Wall(18,8,11,12));
    walls.push(new Wall(11,12,13,14));
    walls.push(new Wall(13,14,17,16));
    walls.push(new Wall(17,16,17,18));
    walls.push(new Wall(17,18,15,18));
    walls.push(new Wall(15,18,13,17));

    addCheckpoint(6,20,7,17);
    addCheckpoint(4,16,5,15);
    addCheckpoint(2,9,4,9);
    addCheckpoint(2,3,4,6);
    addCheckpoint(6,0,6,3);
    addCheckpoint(9,2,9,5);
    addCheckpoint(12,0,12,4);
    addCheckpoint(15,3,15,5);
    addCheckpoint(19,2,18,5);
    addCheckpoint(20,11,18,8);
    addCheckpoint(15,12,11,12);
    addCheckpoint(20,15,17,16);
    addCheckpoint(20,20,17,18);
    addCheckpoint(15,20,15,18);
    addCheckpoint(12,20,12,17);

}

class GridPos{
    constructor(x,y, disabled = false){
        this.fX = x;
        this.fY = y;
        this.x = wpos(x);
        this.y = wpos(y);
        this.geometry = new THREE.CylinderGeometry( 2, 2, 2, 32 );
        this.material = new THREE.MeshBasicMaterial({color: 0xffffff });
        if(disabled){
            this.material.color.set(0xff0000);
        }
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.set(this.x,this.y,0);
        this.mesh.rotation.x = Math.PI/2;
    }
    add(){
        scene.add(this.mesh);
    }
    remove(){
        scene.remove(this.mesh);
    }
}
gridPos =[];
for(let i = 0; i < 21; i++){
    for(let j = 0; j < 21; j++){
        gridPos.push(new GridPos(i,j,i <= 11 && i >= 9 && j === 19));
    }
}
function showGrid(){
    for(const pos of gridPos){
        pos.add();
    }
}
function hideGrid(){
    for(const pos of gridPos){
        pos.remove();
    }
}
function wpos(pos){ // relative wall position
    return -200 + 20 * pos;
}

function moveCameraSmoothly(){
    if(camera.position.y === !buildMode ? 0 : -200){
        updateCheckpointIndex();
        if(buildMode && camera.position.y < 0){
            camera.position.y += 5;
            camera.lookAt(0,0,-camera.position.z*.2);
        }else if(!buildMode && camera.position.y > -200){
            camera.position.y -= 5;
            camera.lookAt(0,0,-camera.position.z*.2);
        }
    }
}
function setBuildMode(bm){
    if(bm){
        buildMode = true;
        document.querySelector("#delete-all").disabled = false;
        document.querySelector("#switch-item").disabled = false;
        document.querySelector("#reset-grid").disabled = false;
        active = false;
        showGrid();
    }else{
        buildMode = false;
        document.querySelector("#delete-all").disabled = true;
        document.querySelector("#switch-item").disabled = true;
        document.querySelector("#reset-grid").disabled = true;
        active = true;
        hideGrid();
        ga.forEach(x => x.respawn());
    }
}

// **********
// BUILD MODE
// **********
let mousePos3D = new THREE.Vector3();
function to3D(e){ // by https://stackoverflow.com/questions/13055214/mouse-canvas-x-y-to-three-js-world-x-y-z
    let vec = new THREE.Vector3(); // create once and reuse
    vec.set(
        ( e.clientX / window.innerWidth ) * 2 - 1,
        - ( e.clientY / window.innerHeight ) * 2 + 1,
        0.5 );

    vec.unproject( camera );

    vec.sub( camera.position ).normalize();

    let distance = - camera.position.z / vec.z;

    mousePos3D.copy( camera.position ).add( vec.multiplyScalar( distance ) );
    mousePos3D.x /= 20;
    mousePos3D.x += 10;
    mousePos3D.y /= 20;
    mousePos3D.y += 10;

    mousePos3D.x = Math.round(mousePos3D.x);
    mousePos3D.y = Math.round(mousePos3D.y);

    console.log(mousePos3D);
}

function highlightGridPos(){
    for(const pos of gridPos){
        if(pos.fX === mousePos3D.x && pos.fY === mousePos3D.y){
            pos.material.color.set(0x00ff00);
        }else{
            pos.material.color.set(0xffffff);
        }
    }
}

let buildCheckpoint = false;
let wallBuildPhase = 0;
let wallBuildPos1;
let wallBuildPos2;
function selectGridPos(){
    if(mousePos3D.x < 0 || mousePos3D.x > 20 || mousePos3D.y < 0 || mousePos3D.y > 20) return;
    for(const pos of gridPos){
        if(pos.fX === mousePos3D.x && pos.fY === mousePos3D.y){
            pos.mesh.scale.set(2,2,2);
        }
    }
    if(wallBuildPhase >= 1){
        wallBuildPos2 = mousePos3D.clone();
        buildCheckpoint ? addCheckpoint(wallBuildPos1.x,wallBuildPos1.y,wallBuildPos2.x,wallBuildPos2.y) : walls.push(new Wall(wallBuildPos1.x,wallBuildPos1.y,wallBuildPos2.x,wallBuildPos2.y));
        for(const pos of gridPos){
            pos.mesh.scale.set(1,1,1);
        }
        wallBuildPhase = 0;
        return;
    }
    wallBuildPos1 = mousePos3D.clone();
    wallBuildPhase++;
}

function deleteAll(template = false){
    for(const wall of walls){
        scene.remove(wall.mesh);
    }
    walls = [];
    for(const checkpoint of checkpoints){
        scene.remove(checkpoint.mesh);
    }
    checkpoints = [];
    checkpointBoundingBoxes = [];
    if(template) addTemplateWalls();
}

document.addEventListener('mousemove', e => {
    if(buildMode){
        to3D(e);
        highlightGridPos();
    }
});
document.addEventListener('mousedown', e => {
    if(buildMode){
        to3D(e);
        selectGridPos();
    }
})



// *********
// FUNCTIONS
// *********





async function loadCarMesh(){
    let gltf = await gltfLoader.loadAsync('assets/glb/car.glb');
    gltf.scene.scale.set(5,5,5);
    gltf.scene.rotation.set(Math.PI/2,-Math.PI/2,0);
    carMesh = gltf.scene;
    carMesh.children[0].children[3].material.color.set(colors[4]);
}
function evolve() {
    failedCounter = 0;
    ga.population.forEach(x => x.obj.failed = true);
    setTimeout(() => {
        ga.evolve();
    }, 100);
    finishPoints = 20;
}
function removeObjWithChildren(obj){
    /*if(obj.children.length > 0){
        for(const child of obj.children){
            removeObjWithChildren(child);
        }
    }
    if(obj.isMesh){
        obj.geometry.dispose();
        obj.material.dispose();
        if (obj.material.map) {
            obj.material.map.dispose();
        }
    }
    if(obj.parent){
        obj.parent.remove(obj);
    }*/

    obj.traverse((c) => {
        if (c.isMesh) {
            c.geometry.dispose();
            c.material.dispose();
            if (c.material.map) {
                c.material.map.dispose();
            }
        }
    });
}
let manualDriveStartTime = 0;
function keyDown(e) {
    if(manualMode) {
        if (e.keyCode == 87) {
            c.acceleration = true;
            manualDriveStartTime = performance.now();
        } else if (e.keyCode == 83) {
            c.deceleration = true;
        } else if (e.keyCode == 65) {
            c.steeringAngle = 1;
        } else if (e.keyCode == 68) {
            c.steeringAngle = -1;
        }
    }
}
function keyUp(e){
    if(manualMode) {
        if (e.keyCode == 87) {
            c.acceleration = false;
            manualDriveTime += performance.now() - manualDriveStartTime;
            manualDriveStartTime = 0;
        } else if (e.keyCode == 83) {
            c.deceleration = false;
        } else if (e.keyCode == 65 || e.keyCode == 68) {
            c.steeringAngle = 0;
        }
    }
}

let trainingIterations = 200; //can be changed
let trainingPosition = 0; // do not change
function train(){
    if(trainingPosition >= trainingData.length){
        trainingPosition = 0;
        trainingIterations--;
        console.log("next Iteration");
        setProgressValue(200 - trainingIterations);
    }
    if(trainingIterations <= 0 || trainingData.length === 0){
        console.log("training finished");
        setNextPhase();
        trainingPhase = false;
        return;
    }
    cnn.bp(trainingData[trainingPosition].input, trainingData[trainingPosition].output);
    trainingPosition++;
}
function setWeights(){
    for(let i = 0; i < ga.population.length; i++){
        ga.population[i].nn = cnn;
    }
}

// Animate
let manualMode = true;
let trainingPhase = false;
function animate(){
    let nextFrameTime = performance.now();
    renderer.render(scene, camera);
    if(active) {
        if(manualMode) {
            c.draw();
        }
        else {
            ga.population.forEach(x => x.obj.draw());
            if (failedCounter >= populationSize) {
                evolve();
            }
        }
    }
    if(trainingPhase) train();
    while(performance.now() <= nextFrameTime + 1000/30 && trainingPhase){
        train();
    }
    //if(nextPhase === 1) setProgressValue((manualDriveTime + (manualDriveStartTime === 0 ? 0 : (performance.now() - manualDriveStartTime))) / 1);
    moveCameraSmoothly();
    // cube.rotation.x += 0.01;
    // cube.rotation.y += 0.01;
    // cube.rotation.z += 0.01;
    requestAnimationFrame(animate);
}

// ****
// INIT
// ****

let active = false;
//LOADING

async function load() {
    let t = new Date();
    await loadCarMesh();
    const walls = [
        [-1, -1, -1, 21],
        [-1, -1, 21, -1],
        [21, 21, -1, 21],
        [21, 21, 21, -1],
    ];
    for(const wall of walls){
        w.push(new Wall(...wall,true));
    }
    ga = new GeneticAlgorithm(populationSize, nnInput, nnHidden, nnOutput, nnLR, objClass);
    ga.setLr(.01);
    c = new Car(null, true);
    t = new Date() - t;
    console.log('loading time: ' + t + 'ms');
    addTemplateWalls();
    await animate();
    setTimeout(animate, 200);
    return true;
}
let nextPhase = 0;
let manualDriveTime = 0;
function setNextPhase(){
    let nextButton = document.querySelector("#next");
    let progressBar = document.querySelector("#progress");
    let infoText = document.querySelector(".info-text");
    let phases = document.querySelectorAll(".phase");
    let arrows = document.querySelectorAll(".arrow");
    let nextGenerationButton = document.querySelector("#next-evolution");
    switch(nextPhase){
        case 0:
            ga.forEach(x => scene.remove(x.mesh));
            nextButton.classList.remove("active");
            infoText.classList.add("active");
            progressBar.classList.add("active");
            phases[0].classList.add("active");
            manualDriveTime = 0;
            active = true;
            break;
        case 1:
            arrows[0].classList.add("active");
            nextButton.classList.add("active");
            infoText.classList.remove("active");
            phases[0].classList.remove("active");
            phases[0].classList.add("finished");
            progressBar.classList.remove("active");
            break;
        case 2:
            scene.remove(c.mesh);
            trainingPhase = true;
            arrows[0].classList.remove("active");
            arrows[0].classList.add("finished");
            phases[1].classList.add("active");
            infoText.classList.add("active");
            infoText.innerHTML = "training...";
            nextButton.classList.remove("active");
            progressBar.classList.add("active");
            break;
        case 3:
            ga.forEach(x => scene.add(x.mesh));
            arrows[1].classList.add("active");
            nextButton.classList.add("active");
            infoText.classList.remove("active");
            phases[1].classList.remove("active");
            phases[1].classList.add("finished");
            progressBar.classList.remove("active");
            break;
        case 4:
            phases[2].classList.add("active");
            arrows[1].classList.remove("active");
            arrows[1].classList.add("finished");
            infoText.classList.add("active");
            infoText.innerHTML = "training...";
            nextButton.classList.remove("active");
            setWeights();
            manualMode = false;
            nextGenerationButton.disabled = false;
            break;

    }
    console.log(nextPhase);
    nextPhase++;
}

function setProgressValue(val){
    let progressBar = document.querySelector("#progress");
    progressBar.value = val;
    if(val >= 200 && nextPhase === 1){
        setNextPhase();
    }
}

// scene

const scene = new THREE.Scene();
const aspectRatio = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
camera.position.set(0,-100,window.innerWidth*-0.20+600);
camera.lookAt(0,0,-camera.position.z*.2);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const gltfLoader = new GLTFLoader();

// lights

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(-100, 100, 100);
scene.add(light);

const textureLoader = new THREE.TextureLoader();
const fiveTone = textureLoader.load('https://threejs.org/examples/textures/gradientMaps/fiveTone.jpg');
fiveTone.minFilter = THREE.NearestFilter;
fiveTone.magFilter = THREE.NearestFilter;

//background plate

const plate = new THREE.Mesh(new THREE.PlaneGeometry(window.innerWidth*3, window.innerHeight*3), new THREE.MeshToonMaterial({color: colors[0], gradientMap: fiveTone }));
scene.add(plate);

// get Colors

// load car
let carMesh;
let c;

let w = [];


// Dat gui

/*const gui = new dat.GUI();
const cameraFolder = gui.addFolder('Camera');
cameraFolder.add(camera.position, 'x', -100, 100);
cameraFolder.add(camera.position, 'y', -100, 100);
cameraFolder.add(camera.position, 'z', -100, 500);
cameraFolder.add(camera.rotation, 'x', -.5, .5);
cameraFolder.add(camera.rotation, 'y', -.5, .5);
cameraFolder.add(camera.rotation, 'z', -.5, .5);
cameraFolder.open();*/




// ***************
// EVENT LISTENERS
// ***************


window.addEventListener('keydown', keyDown, false);

window.addEventListener('keyup', keyUp, false);

window.addEventListener('resize', () => {
    location.reload();
}, false);



// NN SETUP

let populationSize = 50;
let nnInput = 9;
let nnHidden = 50;
let nnOutput = 2;
let nnLR = .1;
let objClass = Car;
let ga;
let failedCounter = 0;

let cnn = new NeuralNetwork(nnInput, nnHidden, nnOutput, nnLR);

setTimeout(load, 200);