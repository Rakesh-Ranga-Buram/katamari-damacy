import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

let renderer,
  scene,
  camera,
  ball,
  plane,
  dragonBall,
  pokeBall,
  objects = [],
  level = 0;

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
    if (level === 2) {
      alert("GAME OVER");
    }
  }
};

// Helper function to calculate overlap between two bounding boxes
function calculateOverlap(box1, box2) {
  const overlap = new THREE.Box3();
  overlap.setFromCenterAndSize(
    new THREE.Vector3(
      Math.max(box1.min.x, box2.min.x),
      Math.max(box1.min.y, box2.min.y),
      Math.max(box1.min.z, box2.min.z)
    ),
    new THREE.Vector3(
      Math.min(box1.max.x, box2.max.x) - Math.max(box1.min.x, box2.min.x),
      Math.min(box1.max.y, box2.max.y) - Math.max(box1.min.y, box2.min.y),
      Math.min(box1.max.z, box2.max.z) - Math.max(box1.min.z, box2.min.z)
    )
  );
  const overlapSize = new THREE.Vector3();
  overlap.getSize(overlapSize);
  return overlapSize.x > 0 && overlapSize.y > 0 && overlapSize.z > 0
    ? overlapSize.length() / 2
    : 0;
}

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

  ball = await load("./assets/worn_baseball_ball/scene.gltf");
  const scale = 2;
  ball.scale.set(scale, scale, scale);
  const boundingBox = new THREE.Box3().setFromObject(ball);
  const ballSize = new THREE.Vector3();
  boundingBox.getSize(ballSize);
  ball.position.y = ballSize.y / 2;
  scene.add(ball);

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

    const dragon_boundingBox = new THREE.Box3().setFromObject(ball);
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
};

let speed = [0, 0, 0];
let acc = 0.0001;
let drag = 0.98;
let turnSpeed = 0.01;
let velocity = 0;
window.loop = (dt, input) => {
  if (ball) {
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
      ball.rotateY(turnSpeed * dt * velocity);
    } else if (input.keys.has("ArrowRight")) {
      ball.rotateY(-turnSpeed * dt * velocity);
    }

    const forward = new THREE.Vector3();
    ball.getWorldDirection(forward);
    ball.position.add(forward.clone().multiplyScalar(velocity));

    // Clamp ball position to the nearest edge of the plane
    const planeBounds = new THREE.Box3().setFromObject(plane);
    const ballSize = new THREE.Vector3();
    const boundingBox = new THREE.Box3().setFromObject(ball);
    boundingBox.getSize(ballSize);
    const ballRadius = ballSize.length() / 2;
    const clampedPosition = new THREE.Vector3().copy(ball.position);
    clampedPosition.x = THREE.MathUtils.clamp(
      clampedPosition.x,
      planeBounds.min.x + ballRadius,
      planeBounds.max.x - ballRadius
    );
    clampedPosition.z = THREE.MathUtils.clamp(
      clampedPosition.z,
      planeBounds.min.z + ballRadius,
      planeBounds.max.z - ballRadius
    );
    ball.position.copy(clampedPosition);

    // collision detection
    const ballBox = new THREE.Box3().setFromObject(ball);
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      if (obj.disabled) {
        continue;
      }

      const box = new THREE.Box3().setFromObject(obj);
      if (ballBox.intersectsBox(box)) {
        if (obj.level === level) {
          obj.disabled = true;
          scene.remove(obj);
          ball.attach(obj); // Attach the collided object to the ball

          // Adjust the position of the attached object
          const overlap = calculateOverlap(ballBox, box);
          obj.position.set(
            obj.position.x - ball.position.x + ballRadius,
            obj.position.y - ball.position.y + ballRadius,
            obj.position.z - ball.position.z + ballRadius
          );
          obj.position.setLength(overlap);

          checkUpdateLevel();
        }
      }
    }

    camera.position.set(
      ball.position.x + 3,
      ball.position.y + 3,
      ball.position.z + 3
    );
    camera.lookAt(ball.position);
  }
  renderer.render(scene, camera);
};
