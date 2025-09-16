// particles-init.js
tsParticles.load("particles-js", {
    fpsLimit: 60, 
    particles: {
        number: {
            value: 100, //ilość cyćków
            density: {
                enable: true, 
                value_area: 800 //im niższy numer tym więcej cyćków
            }
        },
        color: {
            value: "#e5ff00ff" //kolor cyćków
        },
        shape: {
            type: "circle" //kształt cyćków
        },
        opacity: {
            value: 0.1, 
            random: true,
        },
        size: {
            value: { min: 0.1, max: 0.1 } //wielkość cyćków
        },
        move: {
            enable: true, //czy cyćki mają się poruszać
            speed: 2.137, //szybkość cyćków
            direction: "none", //kierunek cyćków
            out_mode: "out",
            bounce: false //czy cyćki mają się odbijać
        },
        links: {
            enable: true, //czy mają być linie między cyćkami
            distance: 200, //długość lini między cyćkami
            color: "#D4B26A", //kolor lini
            opacity: 1.0, //widoczność lini
            width: 0.5 //szerokość lini
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
