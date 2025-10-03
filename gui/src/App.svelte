<script>
	import ROSLIB from 'roslib';
	//	Connecting to ROS
  // -----------------

  var ros = new ROSLIB.Ros({
    url : 'ws://localhost:9090'
  });

  ros.on('connection', function() {
    console.log('Connected to websocket server.');
  });

  ros.on('error', function(error) {
    console.log('Error connecting to websocket server: ', error);
  });

  ros.on('close', function() {
    console.log('Connection to websocket server closed.');
  });

  // Publishing a Topic
  // ------------------

  var cmdVel = new ROSLIB.Topic({
    ros : ros,
    name : '/turtle1/cmd_vel',
    messageType : 'geometry_msgs/msg/Twist'
  });

  const MovementHandler = (Linearx, Lineary, Angularz) => {
	var Twist = new ROSLIB.Message({
		linear : {
			x : Linearx,
			y : Lineary,
			z : 0.0
		},
		angular : {
			x : 0.0,
			y : 0.0,
			z : Angularz
		}
	})
	cmdVel.publish(Twist)
  }

  // Subscribing to a Topic
  // ----------------------
  let battery = 0
  let LinearSpeed = 0.9
  let AngularSpeed = 0.3
  let x = 0
  let y = 0
  let theta = 0
  let linear_v = 0
  let angular_v = 0

  var listener = new ROSLIB.Topic({
    ros : ros,
    name : '/turtle1/pose',
    messageType : 'turtlesim/msg/Pose'
  });

  listener.subscribe(function(message) {
	x = message.x;
	y = message.y;
	theta = message.theta;
	linear_v = message.linear_velocity;
	angular_v = message.angular_velocity;
    console.log('Received message on ' + listener.name + ': ' + message.data);
    // listener.unsubscribe();
  });

  var listener = new ROSLIB.Topic({
    ros : ros,
    name : '/battery',
    messageType : 'int'
  });

  listener.subscribe(function(message) {
	battery = message
    console.log('Received message on ' + listener.name + ': ' + message.data);
  });


  // Calling a service
  // -----------------

//   var addTwoIntsClient = new ROSLIB.Service({
//     ros : ros,
//     name : '/add_two_ints',
//     serviceType : 'rospy_tutorials/AddTwoInts'
//   });

//   var request = new ROSLIB.ServiceRequest({
//     a : 1,
//     b : 2
//   });

//   addTwoIntsClient.callService(request, function(result) {
//     console.log('Result for service call on '
//       + addTwoIntsClient.name
//       + ': '
//       + result.sum);
//   });

  // Getting and setting a param value
  // ---------------------------------

//   ros.getParams(function(params) {
//     console.log(params);
//   });

//   var maxVelX = new ROSLIB.Param({
//     ros : ros,
//     name : 'max_vel_y'
//   });

//   maxVelX.set(0.8);
//   maxVelX.get(function(value) {
//     console.log('MAX VAL: ' + value);
//   });

const move_forward = () => {
	MovementHandler(LinearSpeed, 0, 0)
};

const move_back = () => {
	MovementHandler(-LinearSpeed, 0, 0)
};

const move_left = () => {
	MovementHandler(0, 0, AngularSpeed)
};

const move_right = () => {
	MovementHandler(0, 0, -AngularSpeed)

};
const stop = () => {
	MovementHandler(0, 0, 0)
};

	document.onkeydown = function(e){
		console.log("pressed " + e.key);

		let key = e.key.toLowerCase();
		switch (key){
			case "arrowup":
			case "w":
				move_forward();
				break;
			case "arrowdown":
			case "s":
				move_back();
				break;
			case "arrowright":
			case "d":
				move_right();
				break;
			case "arrowleft":
			case "a":
				move_left();
				break;
			case "+":
			case "=":
				LinearSpeed = LinearSpeed + 0.1;
				break;
			case "-":
				LinearSpeed = LinearSpeed - 0.1;
				if (LinearSpeed < 0)
					LinearSpeed = 0;
				break;
			case "p":
				AngularSpeed = AngularSpeed + 0.1;
				break;
			case "o":
				AngularSpeed = AngularSpeed - 0.1;
				if (AngularSpeed < 0)
					AngularSpeed = 0;
				break;
			case " ":
				stop();
				break;
			default:
				console.log("Invalid Key");
		}
	}
</script>

<main>
	<h1>ROS GUI!</h1>
	<h2>Under Construction.</h2>
	<!-- <div class="turtlesim"> 
		<p>Turtle Sim x: {x}</p>
		<p>Turtle Sim y: {y}</p>
		<p>Turtle Sim theta: {theta}</p>
		<p>Turtle Sim linear velcoity: {linear_v}</p>
		<p>Turtle Sim angular velocity: {angular_v}</p>
	</div> -->
	<p>You can use your keyboard to move</p>
	<p>Battery Percentage: {battery}</p>
	<p>Press 'space' to stop </p>
	<button on:click={move_forward}>Forward</button>
	<button on:click={move_back}>Back</button>
	<button on:click={move_right}>Right</button>
	<button on:click={move_left}>Left</button>
	<button class="stop" on:click={stop}>STOP</button>
	<button class="vup" on:click={LinearSpeed = LinearSpeed + 0.1}>velocity up</button>
	<button class="vdown" on:click={LinearSpeed = LinearSpeed - 0.1}>velocity down</button>
	
	<div class="LinearSlideContainer">
		<p>Linear Speed: </p>
		<input type="range" min="0" max="20" bind:value={LinearSpeed} class="slider" id="myRange">
		<input type="text" bind:value={LinearSpeed}>
		<p>Press '+', '-' to adjust speed</p>
	</div>
	<div class="AngularSlideContainer">
		<p>Angular Speed: </p>
		<input type="range" min="0" max="10" bind:value={AngularSpeed} class="slider" id="myRange">
		<input type="text" bind:value={AngularSpeed}>
		<p>Press 'p', 'o' to adjust speed</p>
	</div>
	
	
</main>


<style>
	
  .stop {
    width: 3cm;
		height: 3cm;
		color: #080808;
		background-color: #f8080875;
		border: 2px solid red;
		text-transform: uppercase;
		border-radius: 3cm;
		line-height: 3cm;
		font-size: 2em;
		font-weight: 100;
		position: absolute;
		top: 10	cm;
		left: 5cm;
  }
  .stop:hover {
    background: darkred;
  }

	.LinearSlideContainer {
		display: flex;
		align-items: left; /* vertically align slider and text */
		gap: 10px; /* space between elements */
	}
	.AngularSlideContainer {
		display: flex;
		align-items: left; /* vertically align slider and text */
		gap: 10px; /* space between elements */
	}

	.slider {
		width: 30%; /* Full-width */
	}

	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}
	h2 {
		color: #752e2e;
		text-transform: uppercase;
		font-size: 2em;
		font-weight: 4;
	}

	p {
		text-align: left;
	}

	button {
		width: 3cm;
		height: 1cm;
		color: #080808;
		background-color: #f8f4089f;
		border: 2px solid red;
		border-radius: 5cm;
		text-transform: lowercase;
		font-size: 1.5em;
		font-weight: 100;
	}
	button:hover {
		background-color: #f3ef00da;
	}

	button {
		position: absolute;
	}
	button:nth-of-type(1) {
		top: 18cm;
		left: 35cm;
	}
	button:nth-of-type(2) {
		top: 21cm;
		left: 35cm;
	}
	button:nth-of-type(3){
		top: 19.5cm;
		left: 38cm;
	}

	button:nth-of-type(4){
		top: 19.5cm;
		left: 32cm;
	}
	
	.vup{
		width: 2.5cm;
		height: 2.5cm;
		color: #080808;
		background-color: #93ff05d7;
		border: 2px solid rgb(171, 236, 52);
		text-transform: lowercase;
		border-radius: 2.5cm;
		line-height: 2.5cm;
		font-size: 1em;
		font-weight: 100;
		position: absolute;
		top: 17cm;
		left: 5cm;
	}
	.vdown{
		width: 2.5cm;
		height: 2.5cm;
		color: #080808;
		background-color: #ffbc05a2;
		border: 2px solid rgb(248, 191, 5);
		text-transform: lowercase;
		border-radius: 2.5cm;
		line-height: 1.5cm;
		font-size: 1em;
		font-weight: 100;
		position: absolute;
		top: 20cm;
		left: 5cm;
	}

	body{
		background-image: url(/home/nayera/ROS-GUI/gui/MIA.jpg);
		background-repeat: no-repeat;
		background-size: 7cm;
		background-position-x:2cm ;
		background-position-y:2cm;
		background-color:rgba(255, 255, 0, 0.103);
	}
	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>

