<script>
	import {ros} from "./RosConnection.js"
	import ROSLIB from "roslib";
	import Joystick from "./Joystick.svelte";
	
	let yaw = 0
	let LinearSpeed = 0.9
	let AngularSpeed = 0.3
	let JoystickSensitivity = 1
	let x = 0
	let y = 0
	let theta = 0
	let linear_v = 0
	let angular_v = 0
    // Publishing a Topic

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
		name : '/yaw',
		messageType : 'int'

	});

	listener.subscribe(function(message){
		yaw = message
		console.log('Received message on'+ listener.name +':'+ message.data)
	})



	const incrementLinear = () =>{
		if (LinearSpeed > 0){
			LinearSpeed += 0.1
		}
	};
	const decrementLinear = () =>{
		if (LinearSpeed > 0.1){
			LinearSpeed -= 0.1
		}
	};
	const incrementAngular = () =>{
		if (AngularSpeed > 0){
			AngularSpeed += 0.1
		}
	};
	const decrementAngular = () =>{
		if (AngularSpeed > 0.1){
			AngularSpeed -= 0.1
		}
	};
	const incrementJoystick = () => {
	if (JoystickSensitivity > 0) {
		JoystickSensitivity += 0.1;
	}
	};

	const decrementJoystick = () => {
		if (JoystickSensitivity > 0.1) {
			JoystickSensitivity -= 0.1;
		}
	};



	const move_forward = () => {
		MovementHandler(LinearSpeed, 0, 0)
	};

	const move_forward_right = () => {
		MovementHandler(LinearSpeed, LinearSpeed, 0)
	};

	const move_forward_left = () => {
		MovementHandler(LinearSpeed, -LinearSpeed, 0)
	};

	const move_back = () => {
		MovementHandler(-LinearSpeed, 0, 0)
	};

	const move_back_right = () => {
		MovementHandler(-LinearSpeed, LinearSpeed, 0)
	};

	const move_back_left = () => {
		MovementHandler(-LinearSpeed, -LinearSpeed, 0)
	};

	const turn_left = () => {
		MovementHandler(0, 0, AngularSpeed)
	};

	const turn_right = () => {
		MovementHandler(0, 0, -AngularSpeed)
	};

	const move_left = () => {
		MovementHandler(0, -LinearSpeed, 0)
	};

	const move_right = () => {
		MovementHandler(0, LinearSpeed, 0)
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
				increment(LinearSpeed);
				break;
			case "-":
				decrement(LinearSpeed);
				break;
			case "p":
				AngularSpeed += 0.1;
				break;
			case "o":
				AngularSpeed -= 0.1;
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

    <!-- <div class="turtlesim"> 
		<p>Turtle Sim x: {x}</p>
		<p>Turtle Sim y: {y}</p>
		<p>Turtle Sim theta: {theta}</p>
		<p>Turtle Sim linear velcoity: {linear_v}</p>
		<p>Turtle Sim angular velocity: {angular_v}</p>
	</div> -->

	<!-- <p>You can use your keyboard to move</p> -->
	<p>Yaw: {yaw}</p>
	<!-- <p>Press 'space' to stop </p> -->
	

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

	
    <div class="movement-pad">
		<div class="turnButtons">
			<button class="TurnLeft" on:mousedown={turn_left} on:mouseup={stop}>⟲</button>
			<button class="TurnRight" on:mousedown={turn_right} on:mouseup={stop}>⟳</button>
		</div>

		<div class="mainButtons">
			<button on:mousedown={move_forward_left} on:mouseup={stop}>↖</button>
		<button on:mousedown={move_forward} on:mouseup={stop}>↑</button>
		<button on:mousedown={move_forward_right} on:mouseup={stop} on>↗</button>

		<button on:mousedown={move_left} on:mouseup={stop}>←</button>
		<button id="stop" on:mousedown={stop} on:mouseup={stop}>✋</button>
		<button on:mousedown={move_right} on:mouseup={stop}>→</button>

		<button on:mousedown={move_back_left} on:mouseup={stop}>↙</button>
		<button on:mousedown={move_back} on:mouseup={stop}>↓</button>
		<button on:mousedown={move_back_right} on:mouseup={stop}>↘</button>
		</div>
	</div>


	<div class="velocity-section">
		<div class="velocity-group">
			<p>Linear</p>
			<div class="velocity-buttons">
				<button class="vup" on:click={() => incrementLinear()}>+</button>
				<button class="vdown" on:click={() => decrementLinear()}>-</button>
			</div>
		</div>

		<div class="velocity-group">
			<p>Angular</p>
			<div class="velocity-buttons">
				<button class="vup" on:click={() => incrementAngular()}>+</button>
				<button class="vdown" on:click={() => decrementAngular()}>-</button>
			</div>
		</div>

		<div class="velocity-group">
			<p>Joystick</p>
			<div class="velocity-buttons">
				<button class="vup" on:click={() => incrementJoystick()}>+</button>
				<button class="vdown" on:click={() => decrementJoystick()}>-</button>
			</div>
		</div>
	</div>

	<Joystick {MovementHandler} sensetivity={JoystickSensitivity}/>

</main>


<style>

	/* @media (max-width: 600px) {
		.movement-pad {
			left: auto;
			right: 10px;
			bottom: 10px;
			width: 80px;
		}
	} */

    p{
		text-align: left;
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

    .movement-pad {
		display: inline-block;
		position: relative;      
		top: 10vh;
		left: 72vw;
		/* border: 5px solid black */
}
	
	.movement-pad button {
		background: #75859C;
		color: #fff;
		font-size: 2vw;
		font-weight: bold;
		padding: 2vw;
		border: none;
		border-radius: 1.2vw;
		box-shadow: 0 0.4vw 0.6vw rgba(0,0,0,0.2);
		cursor: pointer;
		transition: transform 0.15s, background 0.2s;
	}

	.movement-pad button:hover {
		background: #334155;
		transform: scale(1.1);
	}

	#stop{
		background-color: rgb(185, 37, 37);
	}

	.mainButtons{
		display: grid;
		grid-template-columns: repeat(3, 7vw);
		grid-gap: 0.5vw;
		justify-content: center;
		align-items: center;
	}

	.turnButtons {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 11vw; /* space between the two buttons */
	}
 
	.turnButtons button{
		/* position: relative;       */
		font-size: 1.5em;
		background: #DE733D;
		color: #fff;
		font-weight: bold;
		/* padding: 0.7vw; */
		border-radius: 100vw;
		box-shadow: 0 0.2vw 0.3vw rgba(0,0,0,0.2);
		cursor: pointer;
		transition: transform 0.15s, background 0.2s;
	}
	
	.velocity-section {
	position: relative;
	top: 21vh;
	right: 25vw;
	display: inline-block;
	gap: 2vw;
	background: rgba(15, 23, 42, 0.8);
	padding: 1.2vw 1.4vw;
	border-radius: 1vw;
	box-shadow: 0 0.2vw 1vw rgba(0, 0, 0, 0.4);
	color: #fff;
	font-family: sans-serif;
}




.velocity-group {
	display: inline-block;
	gap: 1vw;
}

.velocity-group p {
	font-size: 1.1em;
	font-weight: bold;
	padding-right: 1vw;
}

.velocity-buttons {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1vw;
}

.vup,
.vdown {
	width: 6vw;
	height: 6vw;
	display: flex;              /* centers content */
	align-items: center;        /* vertical center */
	justify-content: center;    /* horizontal center */
	font-size: 1.5vw;
	font-weight: bold;
	color: #111;
	border: none;
	border-radius: 50%;
	cursor: pointer;
	/* transition: all 0.2s ease-in-out; */
}

.vup {
	background-color: #05ff8ad7;
	border: 0.2vw solid rgb(184, 255, 53)d7;
}

.vdown {
	background-color: #DE733D;
	border: 0.2vw solid #ff8548;
}

.vup:hover {
	transform: scale(1.1);
	box-shadow: 0 0 0.4vw #abec34;
}

.vdown:hover {
	transform: scale(1.1);
	box-shadow: 0 0 0.4vw #f8bf05;
}

</style>