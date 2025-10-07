<script>

    import {ros} from "./RosConnection.js"
    import ROSLIB from "roslib";

    let battery = 100

    var listener = new ROSLIB.Topic({
		ros : ros,
		name : '/battery',
		messageType : 'int'
	});

	listener.subscribe(function(message) {
		battery = message
		console.log('Received message on ' + listener.name + ': ' + message.data);
	});


  // Update the display
  function updateBatteryUI() {
    const charge = document.getElementById("charge");
    const chargeLevel = document.getElementById("charge-level");
    const chargingTimeRef = document.getElementById("charging-time");

    const batteryLevel = `${battery}%`;
    charge.style.width = batteryLevel;
    chargeLevel.textContent = batteryLevel;

    // Optional: update color
    if (battery > 60) {
      charge.style.backgroundColor = "#28a745"; // green
    } else if (battery > 30) {
      charge.style.backgroundColor = "#ffc107"; // yellow
    } else {
      charge.style.backgroundColor = "#dc3545"; // red
    }

    chargingTimeRef.innerText = "";
  }

  window.onload = updateBatteryUI;
</script>

<div class="container">
  <div id="battery">
    <div id="charge"></div>
    <div id="charge-level"></div>
  </div>

</div>

<style>
  * {
    padding: 0;
    margin: 0;
    box-sizing: border-box;
    font-family: "Roboto Mono", monospace;
  }
  .container {
    
    position: relative;
    display: inline-block;
    /* transform: translate(-50%, -50%); */
    top: 0;
    left: 87vw;
  }
  #battery {
    box-sizing: content-box;
    height: 5vh;
    width: 8vw;
    border: 0.6em solid #246aed;
    margin: auto;
    border-radius: 0.6em;
    position: relative;
    display: grid;
    place-items: center;
  }
  #battery:before {
    position: absolute;
    content: "";
    left: 8.2vw;
    height: 5vh;
    width: 1vw;
    background-color: #246aed;
    margin: auto;
    top: 0;
    bottom: 0;
    right: -1.6em;
    border-radius: 0 0.3em 0.3em 0;
  }
  #charge {
    position: absolute;
    height: 5vh;
    width: 0%;
    background-color: #1d6cff;
    top: 0vh;
    left: 0;
    transition: width 0.3s ease;
  }
  #charge-level {
    position: absolute;
    font-size: 1em;
    font-weight: 500;
  }
</style>
