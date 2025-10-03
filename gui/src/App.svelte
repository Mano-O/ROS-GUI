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

  var twist = new ROSLIB.Message({
    linear : {
      x : 0.1,
    },
    angular : {
      z : -0.3
    }
  });
  cmdVel.publish(twist);

  // Subscribing to a Topic
  // ----------------------
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
  var twist = new ROSLIB.Message({
    linear: { x: 0.5, y: 0, z: 0 },
    angular: { x: 0, y: 0, z: 0 }
  });
  cmdVel.publish(twist);
};

const move_back = () => {
  var twist = new ROSLIB.Message({
    linear: { x: -0.5, y: 0, z: 0 },
    angular: { x: 0, y: 0, z: 0 }
  });
  cmdVel.publish(twist);
};

const move_left = () => {
  var twist = new ROSLIB.Message({
    linear: { x: 0, y: 0, z: 0 },
    angular: { x: 0, y: 0, z: 0.5 }
  });
  cmdVel.publish(twist);
};

const move_right = () => {
  var twist = new ROSLIB.Message({
    linear: { x: 0, y: 0, z: 0 },
    angular: { x: 0, y: 0, z: -0.5 }
  });
  cmdVel.publish(twist);
};
	document.onkeydown = function(e){
		console.log("pressed " + e.key);


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
			default:
				console.log("Invalid Key");
		}
	}
</script>

<main>
	<h1>ROS GUI!</h1>
	<h2>Under Construction.</h2>
	<p>Turtle Sim x: {x}</p>
	<p>Turtle Sim y: {y}</p>
	<p>Turtle Sim theta: {theta}</p2>
	<p2>linear velcoity: {linear_v}</p2>
	<p>Turtle Sim angular velocity: {angular_v}</p>
	<p3>direction: {direction}</p3>
	<button on:click={move_forward}>Forward</button>
	<button on:click={move_back}>Back</button>
	<button on:click={move_right}>Right</button>
	<button on:click={move_left}>Left</button>
	<button2 on:click={stop}>stop</button2>
	<button3 on:click={inc_velocity}>velocity up</button3>
	<button4 on:click={dec_velocity}>velocity down</button4>
</main>

<style>
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
    p2{
		height: 1cm;
		color: #080808;
		background-color: #f8080842;
		border: 2px solid red;
		text-transform: lowercase;
		font-size: 1.5em;
		font-weight: 100;
		position: absolute;
		top: 7cm;
		left: 30cm;
	}

	p3{
		height: 1cm;
		color: #080808;
		background-color: #f8080842;
		border: 2px solid red;
		text-transform: lowercase;
		font-size: 1.5em;
		font-weight: 100;
		position: absolute;
		top: 8.5cm;
		left: 30cm;
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

	button2{
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

	button3{
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
	button4{
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
