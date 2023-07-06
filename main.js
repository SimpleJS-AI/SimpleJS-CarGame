//initialize scene

const scene = new THREE.Scene();

const aspectRatio = window.innerWidth / window.innerHeight;
const sceneHeight = 200;
const sceneWidth = sceneHeight * aspectRatio;
const camera = new THREE.OrthographicCamera(-sceneWidth / 2, sceneWidth / 2, sceneHeight / 2, -sceneHeight / 2, 0, 200);
camera.position.set(0,-20,100);
camera.lookAt(0,0,0);

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

const plate = new THREE.Mesh(new THREE.PlaneGeometry(window.innerWidth, window.innerHeight), new THREE.MeshBasicMaterial({color: 0x0000ff}));
scene.add(plate);

// car


class Car {
    constructor(individual){
        this.individual = individual;
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.speed = 0;
        this.steeringAngle = 0;
        this.mesh = new THREE.Group();
        scene.add(this.mesh);
        //this.geometry = new THREE.BoxGeometry(20, 10,10);
        this.material = new THREE.MeshToonMaterial({color: 0x00ff00, gradientMap: fiveTone });
        //this.mesh = new THREE.Mesh(this.geometry, this.material);
        gltfLoader.load('assets/glb/car.glb', (gltf) => {
            gltf.scene.scale.set(5,5,5);
            gltf.scene.rotation.set(Math.PI/2,-Math.PI/2,0);
            this.mesh.add(gltf.scene);
        });
        this.acceleration = false;
        this.deceleration = false;
    }
    spawn(){
        scene.add(this.mesh);
    }
    draw(){
        this.direction = new THREE.Vector3(1,0,0);
        this.direction.applyQuaternion(this.mesh.quaternion);   //make direction relative to rotation
        this.x += this.speed;
        this.mesh.position.add(this.direction.multiplyScalar(this.speed));
        this.mesh.rotation.z += this.speed * .025 * this.steeringAngle;
        if(this.acceleration && this.speed < 2){
            this.speed += .05;
        }else if(this.speed > 0){
            if (this.deceleration){
                this.speed -= .05;
            }
            this.speed -= .01;
        }else{
            this.speed = 0;
        }
        //animation
        this.mesh.children[0].rotation.x = Math.PI/2 + Math.sin(this.steeringAngle * this.speed * .1);
    }
    setColor(color){
        //this.mesh.children[0].children[0].children[3].material.color.set(color);
        this.mesh.children[0].children[0].children[3].material = this.material;
    }
}
let c = new Car(0);
c.spawn();





// animate
function animate(){
    renderer.render(scene, camera);
    c.draw();
    // cube.rotation.x += 0.01;
    // cube.rotation.y += 0.01;
    // cube.rotation.z += 0.01;
    requestAnimationFrame(animate);
}
setTimeout(animate, 1000);

// Event listeners

window.addEventListener('message', receiveMessage, false);
function receiveMessage(color){
    console.log("color changed: " + color);
    plate.material.color.setHex(color);
}

window.addEventListener('keydown', keyDown, false);
function keyDown(e){
    if(e.keyCode == 87){
        c.acceleration = true;
    }else if(e.keyCode == 83){
        c.deceleration = true;
    }else if(e.keyCode == 65){
        c.steeringAngle = 1;
    }else if(e.keyCode == 68){
        c.steeringAngle = -1;
    }
}
window.addEventListener('keyup', keyUp, false);
function keyUp(e){
    if(e.keyCode == 87){
        c.acceleration = false;
    }else if(e.keyCode == 83){
        c.deceleration = false;
    }else if(e.keyCode == 65 || e.keyCode == 68){
        c.steeringAngle = 0;
    }
}



// Dat gui

const gui = new dat.GUI();
const cameraFolder = gui.addFolder('Camera');
cameraFolder.add(camera.position, 'x', -100, 100);
cameraFolder.add(camera.position, 'y', -100, 100);
cameraFolder.add(camera.position, 'z', -100, 100);
cameraFolder.add(camera.rotation, 'x', -.5, .5);
cameraFolder.add(camera.rotation, 'y', -.5, .5);
cameraFolder.add(camera.rotation, 'z', -.5, .5);
cameraFolder.open();
