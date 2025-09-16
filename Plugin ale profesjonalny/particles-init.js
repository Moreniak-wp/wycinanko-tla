// particles-init.js
tsParticles.load("particles-js", {
    fpsLimit: 60,
    particles: {
        number: {
            value: 100, 
            density: {
                enable: true,
                value_area: 800
            }
        },
        color: {
            value: "#E8A87C"
        },
        shape: {
            type: "circle"
        },
        opacity: {
            value: 0.6, 
            random: true,
        },
        size: {
            value: { min: 0.1, max: 0.1 }
        },
        move: {
            enable: true,
            speed: 2.1,
            direction: "none",
            out_mode: "out",
            bounce: false
        },
        links: {
            enable: true,
            distance: 200,
            color: "#D4B26A",
            opacity: 9.9, 
            width: 0.5
        }
    },
    interactivity: {
        detect_on: "canvas",
        events: {
            onhover: {
                enable: true,
                mode: "repulse"
            },
        },
        modes: {
            repulse: {
                distance: 80 
            }
        }
    },
    detectRetina: true,
});
