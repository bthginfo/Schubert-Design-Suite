import * as THREE from 'three';

/** Fit every bounding-box corner, including its depth, to the actual camera aspect. */
export function fitPerspectiveBounds(camera:THREE.PerspectiveCamera, box:THREE.Box3, direction:THREE.Vector3, margin=1.16):number {
  if(box.isEmpty())return 1;
  const center=box.getCenter(new THREE.Vector3());
  const backward=direction.lengthSq()>0?direction.clone().normalize():new THREE.Vector3(.8,.7,1).normalize();
  camera.position.copy(center).add(backward);camera.lookAt(center);camera.updateMatrixWorld(true);
  const inverse=camera.quaternion.clone().invert();
  const halfY=Math.tan(THREE.MathUtils.degToRad(camera.getEffectiveFOV())/2),halfX=halfY*Math.max(.01,camera.aspect);
  let distance=.1;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
    const p=new THREE.Vector3(x,y,z).sub(center).applyQuaternion(inverse);
    distance=Math.max(distance,p.z+Math.max(Math.abs(p.x)/halfX,Math.abs(p.y)/halfY)*margin);
  }
  camera.position.copy(center).addScaledVector(backward,distance);
  camera.near=Math.max(.0001,distance/1000);camera.far=Math.max(100,distance+box.getSize(new THREE.Vector3()).length()*10);
  camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  return distance;
}
