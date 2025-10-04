<script>
	import {ros} from "./RosConnection.js"
	import ROSLIB from "roslib";
	import Joystick from "./Joystick.svelte";
	
	let battery = 0
	let LinearSpeed = 0.9
	let AngularSpeed = 0.3
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
		name : '/battery',
		messageType : 'int'
	});

	listener.subscribe(function(message) {
		battery = message
		console.log('Received message on ' + listener.name + ': ' + message.data);
	});

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

	<p>You can use your keyboard to move</p>
	<p>Battery Percentage: {battery}</p>
	<p>Press 'space' to stop </p>

    <div class="movement-pad">
		<button on:mousedown={move_forward_left} on:mouseup={stop}>↖</button>
		<button on:mousedown={move_forward} on:mouseup={stop}>↑</button>
		<button on:mousedown={move_forward_right} on:mouseup={stop} on>↗</button>

		<button on:mousedown={move_left} on:mouseup={stop}>←</button>
		<button on:mousedown={stop} on:mouseup={stop}>⏸</button>
		<button on:mousedown={move_right} on:mouseup={stop}>→</button>

		<button on:mousedown={move_back_left} on:mouseup={stop}>↙</button>
		<button on:mousedown={move_back} on:mouseup={stop}>↓</button>
		<button on:mousedown={move_back_right} on:mouseup={stop}>↘</button>
	</div>

	<div class="TurnButtons">
	<button class="TurnLeft" on:mousedown={turn_left} on:mouseup={stop}>⟲</button>
	<button class="TurnRight" on:mousedown={turn_right} on:mouseup={stop}>⟳</button>
	</div>
	
	<div class="velocity-section">
		<div class="velocity-group">
			<p>Linear</p>
			<div class="velocity-buttons">
				<button class="vup" on:click={() => incrementLinear()}>▲</button>
				<button class="vdown" on:click={() => decrementLinear()}>▼</button>
			</div>
		</div>

		<div class="velocity-group">
			<p>Angular</p>
			<div class="velocity-buttons">
				<button class="vup" on:click={() => incrementAngular()}>▲</button>
				<button class="vdown" on:click={() => decrementAngular()}>▼</button>
			</div>
		</div>
	</div>




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
	<Joystick {MovementHandler} />

</main>


<style>

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
		position: fixed;        /* stays in place even when scrolling */
		bottom: 20px;           /* distance from bottom */
		right: 50px; 
		display: grid;
		grid-template-columns: repeat(3, 80px);
		grid-gap: 10px;
		justify-content: center;
		align-items: center;
		margin-top: 30px;
}

	.movement-pad button {
		background: #1e293b;
		color: #fff;
		font-size: 18px;
		font-weight: bold;
		padding: 15px;
		border: none;
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(0,0,0,0.2);
		cursor: pointer;
		transition: transform 0.15s, background 0.2s;
	}

	.movement-pad button:hover {
		background: #334155;
		transform: scale(1.1);
	}

	.TurnButtons button{
		position: fixed;        /* stays in place even when scrolling */
		font-size: 25px;
		background: #0f766e;
		color: #fff;
		font-weight: bold;
		padding: 15px;
		border: none;
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(0,0,0,0.2);
		cursor: pointer;
		transition: transform 0.15s, background 0.2s;
		
	}
	.TurnLeft {
		bottom: 220px;           /* distance from bottom */
		right: 280px; 
	}
	.TurnRight {
		bottom: 220px;           /* distance from bottom */
		right: 30px; 
	}
	
	.velocity-section {
	position: fixed;
	bottom: 20px;
	left: 20px;
	display: flex;
	flex-direction: row;
	gap: 40px;
	background: rgba(15, 23, 42, 0.8);
	padding: 15px 25px;
	border-radius: 16px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
	color: #fff;
	font-family: sans-serif;
}




.velocity-group {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;
}

.velocity-group p {
	font-size: 1.1em;
	font-weight: bold;
	margin: 0;
}

.velocity-buttons {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.vup,
.vdown {
	width: 60px;
	height: 60px;
	font-size: 1.5em;
	font-weight: bold;
	color: #111;
	border: none;
	border-radius: 50%;
	cursor: pointer;
	transition: all 0.2s ease-in-out;
}

.vup {
	background-color: #93ff05d7;
	border: 2px solid #abec34;
}

.vdown {
	background-color: #ffbc05a2;
	border: 2px solid #f8bf05;
}

.vup:hover {
	transform: scale(1.1);
	box-shadow: 0 0 10px #abec34;
}

.vdown:hover {
	transform: scale(1.1);
	box-shadow: 0 0 10px #f8bf05;
}

</style>