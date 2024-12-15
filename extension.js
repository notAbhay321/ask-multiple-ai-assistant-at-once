let selectedPrePrompt = null; // Track the selected pre-prompt

module.exports = {
    activate: function(context) {
        // No special activation logic needed
    },
    
    // Method to handle pre-prompt button clicks
    setPrePrompt: function(prePrompt) {
        selectedPrePrompt = prePrompt;
    },
    
    // Method to reset pre-prompt
    resetPrePrompt: function() {
        selectedPrePrompt = null;
    },
    
    handleInput: function(input) {
        console.log("Received input:", input);
        
        // Only add pre-prompt if one is explicitly selected
        if (selectedPrePrompt) {
            const result = selectedPrePrompt + "\n\n" + input;
            // Reset the pre-prompt after use (optional)
            this.resetPrePrompt();
            return result;
        }
        
        // Return input as-is if no pre-prompt is selected
        return input;
    }
}; 