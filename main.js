//initialize scene

const scene = new THREE.Scene();
const aspectRatio = window.innerWidth / window.innerHeight;
const sceneHeight = 200;
const sceneWidth = sceneHeight * aspectRatio;
const camera = new THREE.OrthographicCamera(-sceneWidth / 2, sceneWidth / 2, sceneHeight / 2, -sceneHeight / 2, -100, 100);
camera.position.set(sceneWidth / 2,sceneHeight / 2);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// test

const geometry = new THREE.BoxGeometry(10,10,10);
const material = new THREE.MeshBasicMaterial({color: 0xff0000});
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

camera.position.z = 5;

//background plate

const plate = new THREE.Mesh(new THREE.PlaneGeometry(window.innerWidth, window.innerHeight), new THREE.MeshBasicMaterial({color: 0x0000ff}));
scene.add(plate);





function receiveMessage(color){
    plate.material.color.setHex(color);
}




// animate

function animate(){
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    cube.rotation.z += 0.01;
}
animate();

// Event listeners

window.addEventListener('message', receiveMessage, false);