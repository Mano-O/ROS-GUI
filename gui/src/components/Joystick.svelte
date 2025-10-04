<script>
  import { onMount } from 'svelte';
  import nipplejs from 'nipplejs';
  export let sensetivity = 1

  export let MovementHandler = (lin, x, ang) => {
    console.log("Movement:", lin, x, ang);
  };

  let LinearSpeed = 0;
  let AngularSpeed = 0;
  let joystick;

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
        const direction = data.angle.degree; // 0–360 degrees
        const force = data.force; // how far from center (0–1)
        
        console.log("JOYSTICK ANGLE: "+ data.angle.degree, "Force: "+ direction)

        // Convert joystick direction to movement speeds
        const x = Math.cos((direction * Math.PI) / 180) * force * sensetivity;
        const y = Math.sin((direction * Math.PI) / 180) * force * sensetivity;
        console.log("X: ",x,"Y: ", y);

        MovementHandler(x, y, 0); // call external movement function
      }
    });

    joystick.on('end', () => {
      MovementHandler(0, 0, 0); // stop robot on release
    });
  });
</script>

<div id="joystick-zone" class="joystick-zone"></div>

<style>
  .joystick-zone {
    position: fixed;
    bottom: 40px;
    right: 850px;
    width: 200px;
    height: 200px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 50%;
    touch-action: none;
  }
</style>
