// Helper to dispatch mock events
const dispatch = (event: string, data: any) => {
    const customEvent = new CustomEvent(`mock:${event}`, { detail: data });
    document.dispatchEvent(customEvent);
};

export const startSimulation = () => {
    console.log('Starting Simulation...');

    let step = 0;
    const steps = [
        // Step 0: Initial
        () => {
            dispatch('status', { state: 'listening' });
            dispatch('transcription', { text: '', is_final: true, speaker: 'ai' }); // Clear
        },
        // Step 1: User speaks
        () => {
            dispatch('status', { state: 'listening' });
            dispatch('transcription', { text: 'Show me the project files.', is_final: true, speaker: 'user' });
        },
        // Step 2: Processing
        () => {
            dispatch('status', { state: 'processing' });
        },
        // Step 3: AI Responds
        () => {
            dispatch('status', { state: 'speaking' });
            dispatch('transcription', { text: 'Opening project directory...', is_final: true, speaker: 'ai' });
        },
        // Step 4: Tool Event?
        () => {
            dispatch('project_update', { active_project: 'Lexi-UI' });
        },
        // Step 5: Back to idle
        () => {
            dispatch('status', { state: 'listening' });
        }
    ];

    const interval = setInterval(() => {
        if (step < steps.length) {
            steps[step]();
            step++;
        }
    }, 3000); // Next step every 3 seconds

    return () => clearInterval(interval);
};
