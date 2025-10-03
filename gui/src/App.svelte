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
	<p>Turtle Sim theta: {theta}</p>
	<p>Turtle Sim linear velcoity: {linear_v}</p>
	<p>Turtle Sim angular velocity: {angular_v}</p>
	<button on:click={move_forward}>Forward</button>
	<button on:click={move_back}>Back</button>
	<button on:click={move_right}>Right</button>
	<button on:click={move_left}>Left</button>
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

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
