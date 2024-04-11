import * as THREE from 'three';

window.init = async (canvas) => {
  const scene = new THREE.Scene();

  console.log('made a scene', scene);
};

let speed = [0, 0, 0];
window.loop = (dt, canvas, input) => {
  /** example
  if (input.keys.has('ArrowUp')) {
    speed[1] += 0.1;
  } else {
    speed[1] *= 0.9;
  }
  */
};

