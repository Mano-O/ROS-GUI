<script>


	const move_forward = () => {
		// function
		console.log("Moving forward...");
	}
	const move_back = () => {
		// function
		console.log("Moving back...");
	}
	const move_right = () => {
		// function
		console.log("Moving right...");
	}
	const move_left = () => {
		// function
		console.log("Moving left...");
	}
</script>

<main>
	<h1>ROS GUI!</h1>
	<h2>Under Construction.</h2>
	<p>ODOM READING: </p>
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

	p{
		text-align: left;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>