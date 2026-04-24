export const FORMATIONS = {
    "4-3-3": {
        id: "formation-4-3-3",
        label: "4-3-3",
        mode: "formation",
        players: [
            // Goalkeeper
            { dx: 0, dy: 250, number: 1, name: "GK", color: "#f59e0b" },
            // Defenders
            { dx: -150, dy: 150, number: 2, name: "RB", color: "#ef4444" },
            { dx: -50, dy: 150, number: 5, name: "CB", color: "#ef4444" },
            { dx: 50, dy: 150, number: 6, name: "CB", color: "#ef4444" },
            { dx: 150, dy: 150, number: 3, name: "LB", color: "#ef4444" },
            // Midfielders
            { dx: -100, dy: 0, number: 8, name: "CM", color: "#ef4444" },
            { dx: 0, dy: 0, number: 6, name: "CM", color: "#ef4444" },
            { dx: 100, dy: 0, number: 4, name: "CM", color: "#ef4444" },
            // Forwards
            { dx: -120, dy: -150, number: 11, name: "LW", color: "#ef4444" },
            { dx: 0, dy: -150, number: 9, name: "ST", color: "#ef4444" },
            { dx: 120, dy: -150, number: 7, name: "RW", color: "#ef4444" },
        ],
    },
    "4-4-2": {
        id: "formation-4-4-2",
        label: "4-4-2",
        mode: "formation",
        players: [
            // Goalkeeper
            { dx: 0, dy: 250, number: 1, name: "GK", color: "#f59e0b" },
            // Defenders
            { dx: -150, dy: 150, number: 2, name: "RB", color: "#ef4444" },
            { dx: -50, dy: 150, number: 5, name: "CB", color: "#ef4444" },
            { dx: 50, dy: 150, number: 6, name: "CB", color: "#ef4444" },
            { dx: 150, dy: 150, number: 3, name: "LB", color: "#ef4444" },
            // Midfielders
            { dx: -150, dy: 0, number: 7, name: "RM", color: "#ef4444" },
            { dx: -50, dy: 0, number: 8, name: "CM", color: "#ef4444" },
            { dx: 50, dy: 0, number: 4, name: "CM", color: "#ef4444" },
            { dx: 150, dy: 0, number: 11, name: "LM", color: "#ef4444" },
            // Forwards
            { dx: -50, dy: -150, number: 9, name: "ST", color: "#ef4444" },
            { dx: 50, dy: -150, number: 10, name: "ST", color: "#ef4444" },
        ],
    },
    "3-5-2": {
        id: "formation-3-5-2",
        label: "3-5-2",
        mode: "formation",
        players: [
            // Goalkeeper
            { dx: 0, dy: 250, number: 1, name: "GK", color: "#f59e0b" },
            // Defenders
            { dx: -100, dy: 150, number: 5, name: "CB", color: "#ef4444" },
            { dx: 0, dy: 150, number: 6, name: "CB", color: "#ef4444" },
            { dx: 100, dy: 150, number: 4, name: "CB", color: "#ef4444" },
            // Midfielders
            { dx: -150, dy: 0, number: 7, name: "WB", color: "#ef4444" },
            { dx: -75, dy: 0, number: 8, name: "CM", color: "#ef4444" },
            { dx: 0, dy: 0, number: 10, name: "CM", color: "#ef4444" },
            { dx: 75, dy: 0, number: 4, name: "CM", color: "#ef4444" },
            { dx: 150, dy: 0, number: 11, name: "WB", color: "#ef4444" },
            // Forwards
            { dx: -50, dy: -150, number: 9, name: "ST", color: "#ef4444" },
            { dx: 50, dy: -150, number: 10, name: "ST", color: "#ef4444" },
        ],
    },
};