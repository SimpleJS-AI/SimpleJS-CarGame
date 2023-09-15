

// *******
// CLASSES
// *******


class Car {
    constructor(individual){
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
    spawn(){
        scene.add(this.mesh);
    }
    draw(){
        if(!this.failed) {
            this.direction = new THREE.Vector3(1, 0, 0);
            this.direction.applyQuaternion(this.mesh.quaternion);   //make direction relative to rotation
            this.x += this.speed;
            this.mesh.position.add(this.direction.multiplyScalar(this.speed));
            this.mesh.rotation.z += this.speed * .025 * this.steeringAngle;
            if (this.acceleration && this.speed < 2) {
                this.speed += .05;
            } else if (this.speed > 0) {
                if (this.deceleration) {
                    this.speed -= .05;
                }
                this.speed -= .01;
            } else {
                this.speed = 0;
            }
            this.individual.fitness += this.speed;
            //animation
            this.mesh.children[0].rotation.x = Math.PI / 2 + Math.sin(this.steeringAngle * this.speed * .1);

            //raycaster
            this.updateRaycaster();
            //this.visualizeRaycaster();

            //NN
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

            //collision
            this.checkFailed()
        }else if(this.mesh != null){
            removeObjWithChildren(this.mesh);
            scene.remove(this.mesh);
            this.mesh = null;
        }
    }
    checkFailed(){
        /*this.raycaster0.set(this.mesh.position, new THREE.Vector3(1,0,0)
            .applyQuaternion(this.mesh.quaternion)
            .applyQuaternion(new THREE.Quaternion()
                .setFromAxisAngle(new THREE.Vector3(0,0,1), -Math.PI/8)));
        this.raycasterHelper0 = new THREE.ArrowHelper(this.raycaster0.ray.direction, this.raycaster0.ray.origin, 10, 0xff0000);
        this.raycasterHelper0.position.z = 10;
        scene.add(this.raycasterHelper0);*/
        /*let intersections = this.raycaster0.intersectObjects(scene.children, );
        if(intersections.length > 0){
            console.log(intersections[0].distance);
        }*/
        /*for (const wall of w){
            if(this.carBox.intersectsBox(new THREE.Box3().setFromObject(wall.mesh, true))){
                return true;
            }
        }*/
        let failed = false;
        if(this.speed === 0) this.speedFailCounter++;
        if(this.speedFailCounter > 100)failed = true;
        for(let i = 0; i < this.raycaster.length; i++){
            if(this.raycasterData[i] < .02){
                failed = true;
            }
        }
        if(failed){
            failedCounter++;
            this.failed = true;
            this.updateRaycaster();
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
}



// ***********
// WALLS SETUP
// ***********

let buildMode = false;
const walls = [];
class Wall {
    constructor(x1,y1,x2,y2, border = false){
        this.x1 = wpos(x1);
        this.y1 = wpos(y1);
        this.x2 = wpos(x2);
        this.y2 = wpos(y2);
        this.p1 = new THREE.Vector3(this.x1,this.y1,0);
        this.p2 = new THREE.Vector3(this.x2,this.y2,0);
        this.material = new THREE.MeshLambertMaterial({color: 0x00ff00});
        if(border){
            this.material.color.set(0xff0000);
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
//TODO
function addTemplateWalls(){
    walls.push(new Wall(6,20,0,14));
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
}
class GridPos{
    constructor(x,y, disabled = false){
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
        showGrid();
    }else{
        buildMode = false;
        hideGrid();
    }
}

// *********
// FUNCTIONS
// *********


function setColors() {
    fetch('https://raw.githubusercontent.com/flug8/SimpleJS/master/colors.json')
        .then(response => response.json())
        .then(data => colors = data)
        .then(() => {
            plate.material.color.set(colors.c1);
        });
}


async function loadCarMesh(){
    let gltf = await gltfLoader.loadAsync('assets/glb/car.glb');
    gltf.scene.scale.set(5,5,5);
    gltf.scene.rotation.set(Math.PI/2,-Math.PI/2,0);
    carMesh = gltf.scene;
}
function evolve() {
    ga.population.forEach(x => x.obj.failed = true);
    setTimeout(() => {
        ga.evolve();
    }, 100);
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
function keyDown(e){
    if(e.keyCode == 13) {
        setBuildMode(!buildMode);
    }else if(e.keyCode == 32){
        active = !active;
        if(active)animate();
    }
    /*if(e.keyCode == 87){
        c.acceleration = true;
    }else if(e.keyCode == 83){
        c.deceleration = true;
    }else if(e.keyCode == 65){
        c.steeringAngle = 1;
    }else if(e.keyCode == 68){
        c.steeringAngle = -1;
    }*/
}
function keyUp(e){
    if(e.keyCode == 87){
        c.acceleration = false;
    }else if(e.keyCode == 83){
        c.deceleration = false;
    }else if(e.keyCode == 65 || e.keyCode == 68){
        c.steeringAngle = 0;
    }
}

// Animate
function animate(){
    renderer.render(scene, camera);
    //c.draw();
    ga.population.forEach(x => x.obj.draw());
    moveCameraSmoothly();
    if(failedCounter >= populationSize) {
        failedCounter = 0;
        evolve();
    }
    // cube.rotation.x += 0.01;
    // cube.rotation.y += 0.01;
    // cube.rotation.z += 0.01;
    if(active) {
        requestAnimationFrame(animate);
    }
}

// ****
// INIT
// ****

let active = false;
//LOADING

async function load() {
    let t = new Date();
    await setColors();
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
    t = new Date() - t;
    console.log('loading time: ' + t + 'ms');
    addTemplateWalls();
    await animate();
    setTimeout(animate, 200);
    return true;
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

const plate = new THREE.Mesh(new THREE.PlaneGeometry(window.innerWidth*3, window.innerHeight*3), new THREE.MeshToonMaterial({color: 0x00ff00, gradientMap: fiveTone }));
scene.add(plate);

// get Colors
let colors;

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
let nnHidden = 18;
let nnOutput = 2;
let nnLR = .1;
let objClass = Car;
let ga;
let failedCounter = 0;

setTimeout(load, 200);