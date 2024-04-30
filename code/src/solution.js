import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let renderer,
  scene,
  camera,
  car,
  plane,
  dragonBall,
  pokeBall,
  table,
  can,
  objects = [],
  level = 0;

// Define the particle system parameters
const particleCount = 100;
const particleGeometry = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);

for (let i = 0; i < particleCount; i++) {
  positions[i * 3] = Math.random() * 2 - 1;
  positions[i * 3 + 1] = Math.random() * 2 - 1;
  positions[i * 3 + 2] = Math.random() * 2 - 1;
}

particleGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(positions, 3)
);
const particleMaterial = new THREE.PointsMaterial({
  color: 0xff0000,
  size: 0.2,
});

const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
particleSystem.visible = false; // Initially invisible

const load = (url) =>
  new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
  });

const checkUpdateLevel = () => {
  let levelCompleted = true;

  for (const obj of objects) {
    if (!obj.disabled && obj.level === level) {
      levelCompleted = false;
      break;
    }
  }

  if (levelCompleted) {
    level++;
    if (level === 4) {
      alert("GAME OVER");
    }
  }
};

// Load sound
const collisionSound = new Audio("./assets/clank-car-crash-collision-6206.mp3");

window.init = async () => {
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(5, 5, 5);
  camera.lookAt(0, 0, 0);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 10);
  scene.add(directionalLight);

  const geometry = new THREE.PlaneGeometry(1, 1);
  const texture = new THREE.TextureLoader().load("./assets/tile.jpg");
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(50, 50);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
  });
  plane = new THREE.Mesh(geometry, material);
  plane.rotateX(-Math.PI / 2);
  plane.scale.set(100, 100, 100);
  scene.add(plane);

  car = await load("./assets/mclaren_senna_free/scene.gltf");
  const scale = 1;
  car.scale.set(scale, scale, scale);
  const boundingBox = new THREE.Box3().setFromObject(car);
  const carSize = new THREE.Vector3();
  boundingBox.getSize(carSize);
  car.position.y = carSize.y / 2;
  scene.add(car);

  dragonBall = await load("./assets/dragon_ball/scene.gltf");
  const numDragonBalls = 2;
  for (let i = 0; i < numDragonBalls; i++) {
    const dragonBallClone = dragonBall.clone();
    dragonBallClone.level = 0;

    const scale = 12 + Math.random() * 0.005;
    dragonBallClone.scale.set(scale, scale, scale);
    dragonBallClone.position.set(
      Math.random() * 50 - 5,
      0,
      Math.random() * 50 - 5
    );

    const dragon_boundingBox = new THREE.Box3().setFromObject(car);
    const dragon_ballSize = new THREE.Vector3();
    dragon_boundingBox.getSize(dragon_ballSize);
    dragonBallClone.position.y = dragon_ballSize.y / 2;
    dragonBallClone.scale.set(10, 10, 10);

    scene.add(dragonBallClone);
    objects.push(dragonBallClone);
  }

  pokeBall = await load("./assets/poke_ball/scene.gltf");
  const numPokeBalls = 2;
  for (let i = 0; i < numPokeBalls; i++) {
    const pokeBallClone = pokeBall.clone();
    pokeBallClone.level = 1;

    pokeBallClone.scale.set(0.5, 0.5, 0.5);

    pokeBallClone.position.set(
      Math.random() * 50 - 4,
      0,
      Math.random() * 50 - 4
    );
    scene.add(pokeBallClone);
    objects.push(pokeBallClone);
  }

  table = await load("./assets/printable_treasure_chest/scene.gltf");
  const tables = 2;
  for (let i = 0; i < tables; i++) {
    const tableClone = table.clone();
    tableClone.level = 2;

    tableClone.scale.set(0.5, 0.5, 0.5);

    tableClone.position.set(Math.random() * 50 - 4, 0, Math.random() * 50 - 4);
    scene.add(tableClone);
    objects.push(tableClone);
  }

  can = await load("./assets/french_coke_can/scene.gltf");
  const cans = 2;
  for (let i = 0; i < cans; i++) {
    const canClone = can.clone();
    canClone.level = 3;

    canClone.scale.set(0.2, 0.3, 0.4);

    canClone.position.set(Math.random() * 50 - 4, 0, Math.random() * 50 - 4);
    scene.add(canClone);
    objects.push(canClone);
  }

  // Add the particle system to the scene
  scene.add(particleSystem);
};

let acc = 0.0001;
let drag = 0.98;
let turnSpeed = 0.01;
let velocity = 0;
window.loop = (dt, input) => {
  if (car) {
    // acceleration/deceleration
    if (input.keys.has("ArrowUp")) {
      velocity = Math.min(1, velocity + dt * acc);
    } else if (input.keys.has("ArrowDown")) {
      velocity = Math.max(-1, velocity - dt * acc);
    } else {
      velocity *= drag;
    }

    // turn
    if (input.keys.has("ArrowLeft")) {
      car.rotateY(turnSpeed * dt * velocity);
    } else if (input.keys.has("ArrowRight")) {
      car.rotateY(-turnSpeed * dt * velocity);
    }

    const forward = new THREE.Vector3();
    car.getWorldDirection(forward);
    car.position.add(forward.clone().multiplyScalar(velocity));

    // Clamp car position to the nearest edge of the plane
    const planeBounds = new THREE.Box3().setFromObject(plane);
    const carSize = new THREE.Vector3();
    const boundingBox = new THREE.Box3().setFromObject(car);
    boundingBox.getSize(carSize);
    const carRadius = carSize.length() / 2;
    const clampedPosition = new THREE.Vector3().copy(car.position);
    clampedPosition.x = THREE.MathUtils.clamp(
      clampedPosition.x,
      planeBounds.min.x + carRadius,
      planeBounds.max.x - carRadius
    );
    clampedPosition.z = THREE.MathUtils.clamp(
      clampedPosition.z,
      planeBounds.min.z + carRadius,
      planeBounds.max.z - carRadius
    );
    car.position.copy(clampedPosition);

    // collision detection
    const carBox = new THREE.Box3().setFromObject(car);
    const box = new THREE.Box3();
    let isColliding = false; // Flag to track collision with objects of other levels

    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      if (obj.disabled) {
        continue;
      }

      box.setFromObject(obj);
      if (carBox.intersectsBox(box)) {
        if (obj.level === level) {
          obj.disabled = true;
          scene.remove(obj);

          // Calculate the contact point between the car and the object
          const contactPoint = new THREE.Vector3();
          carBox.getCenter(contactPoint); // Get the center of the car
          box.clampPoint(contactPoint, contactPoint); // Get the closest point on the object's bounding box to the car

          // Calculate the offset from the car's center to the contact point
          const offset = contactPoint.clone().sub(car.position);

          // Calculate the position of the object relative to the car's surface
          const carForward = new THREE.Vector3(); // Direction vector pointing forward from the car
          car.getWorldDirection(carForward);

          const carRight = new THREE.Vector3(); // Direction vector pointing to the right from the car
          car.getWorldDirection(carRight);
          carRight
            .crossVectors(carRight, new THREE.Vector3(0, 1, 0))
            .normalize(); // Calculate the right vector based on Y-axis

          const objectHeightOffset = box.max.y - obj.position.y; // Adjust the offset based on the object's height

          // Determine the direction of attachment based on the car's forward vector and the relative position of the object
          const attachmentDirection = new THREE.Vector3()
            .subVectors(contactPoint, car.position)
            .normalize();

          // Calculate the appropriate surface offset based on the attachment direction
          let surfaceOffset;
          if (attachmentDirection.dot(carRight) > 0) {
            // Object attached to the right side of the car
            surfaceOffset = carRight.clone().multiplyScalar(objectHeightOffset);
          } else {
            // Object attached to the left side of the car
            surfaceOffset = carRight
              .clone()
              .multiplyScalar(-objectHeightOffset);
          }

          const finalOffset = offset.sub(surfaceOffset);

          // Set the position of the object relative to the car
          obj.position.copy(car.position).add(finalOffset);

          car.attach(obj); // Attach the collided object to the car

          // Show the particle system at the collision point
          particleSystem.position.copy(contactPoint);
          particleSystem.visible = true;

          // Play collision sound
          collisionSound.play();

          // Hide the particle system after a short delay
          setTimeout(() => {
            particleSystem.visible = false;
          }, 500); // Adjust the duration as needed

          checkUpdateLevel();
        } else {
          // If collided object is not of the current level
          isColliding = true;
        }
      }
    }

    if (isColliding) {
      // Reduce speed when colliding with object of other level
      velocity *= 0.9; // Adjust the reduction factor as needed
    }

    camera.position.set(
      car.position.x + 3,
      car.position.y + 3,
      car.position.z + 3
    );
    camera.lookAt(car.position);
  }
  renderer.render(scene, camera);
};