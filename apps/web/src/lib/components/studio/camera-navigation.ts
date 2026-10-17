export type CameraAction = 'left'|'right'|'up'|'down'|'pan_left'|'pan_right'|'pan_up'|'pan_down'|'zoom_in'|'zoom_out'|'front'|'side'|'top';
export type CameraCommand = {id:number;action:CameraAction};
