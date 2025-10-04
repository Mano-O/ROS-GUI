<script>
    
import { onMount } from 'svelte';
import nipplejs from 'nipplejs';

let joystick;
let LinearSpeed = 0;
let AngularSpeed = 0;

onMount(() => {
  const options = {
    zone: document.getElementById('joystick-zone'),
    mode: 'static',
    position: { left: '50%', top: '50%' },
    color: 'green',
    size: 120
  };

  joystick = nipplejs.create(options);

  joystick.on('move', (evt, data) => {
    if (data && data.angle) {
      const direction = data.angle.degree; // 0-360 degrees
      const force = data.force; // how far from center (0–1)
      
      // Example: map joystick direction to robot movement
      const lin = Math.cos((direction * Math.PI) / 180) * force;
      const ang = Math.sin((direction * Math.PI) / 180) * force;

      LinearSpeed = lin;
      AngularSpeed = ang;

      MovementHandler(lin, 0, ang); // send command to ROS
    }
  });

  joystick.on('end', () => {
    MovementHandler(0, 0, 0); // stop when released
  });
});

</script>


<div id="joystick-zone" class="joystick-zone"></div>

<style>
    .joystick-zone {
  position: fixed;
  bottom: 20px;
  right: 300px;
  width: 150px;
  height: 150px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 50%;
  touch-action: none;
}

</style>