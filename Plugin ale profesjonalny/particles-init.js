// particles-init.js
tsParticles.load("particles-js", {
    fpsLimit: 60,
    particles: {
        number: {
            value: 70, 
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
            value: { min: 2, max: 4 }
        },
        move: {
            enable: true,
            speed: 0.8,
            direction: "none",
            out_mode: "out",
            bounce: false
        },
        links: {
            enable: true,
            distance: 150,
            color: "#D4B26A",
            opacity: 0.3, 
            width: 1
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
