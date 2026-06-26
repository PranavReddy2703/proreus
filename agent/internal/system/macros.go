package system

import (
	"fmt"
	"os/exec"
	"sync"

	"github.com/PranavReddy2703/proreus/agent/internal/api/generated"
)

var (
	macrosMap = make(map[string]generated.Macro)
	macrosMu  sync.RWMutex
)

func boolPtr(b bool) *bool {
	return &b
}

func init() {
	// Initialize with mock whoami macro
	id := generateID()
	macrosMap[id] = generated.Macro{
		Id:          id,
		Name:        "Who am I",
		Description: "Prints the current user running the agent",
		Command:     "whoami",
		IsDangerous: boolPtr(false),
	}

    
    // Add a few more fun ones
    id2 := generateID()
    macrosMap[id2] = generated.Macro{
        Id: id2,
        Name: "List Directory",
        Description: "Lists files in the current directory",
        Command: "ls -la",
        IsDangerous: boolPtr(false),
    }
}

func GetMacros() []generated.Macro {
	macrosMu.RLock()
	defer macrosMu.RUnlock()

	var result []generated.Macro
	for _, m := range macrosMap {
		result = append(result, m)
	}
	return result
}

func CreateMacro(input generated.MacroInput) generated.Macro {
	macrosMu.Lock()
	defer macrosMu.Unlock()

	id := generateID()
    isDangerous := false
    if input.IsDangerous != nil {
        isDangerous = *input.IsDangerous
    }
    
	m := generated.Macro{
		Id:          id,
		Name:        input.Name,
		Description: input.Description,
		Command:     input.Command,
		IsDangerous: &isDangerous,
	}
	macrosMap[id] = m
	return m
}

func DeleteMacro(id string) bool {
	macrosMu.Lock()
	defer macrosMu.Unlock()

	if _, exists := macrosMap[id]; exists {
		delete(macrosMap, id)
		return true
	}
	return false
}

func ExecuteMacro(id string) (generated.MacroExecutionResult, error) {
	macrosMu.RLock()
	m, exists := macrosMap[id]
	macrosMu.RUnlock()

	if !exists {
		return generated.MacroExecutionResult{
			Success: false,
			Output:  "Macro not found",
		}, fmt.Errorf("macro not found")
	}

	cmd := exec.Command("bash", "-c", m.Command)
	
	out, err := cmd.CombinedOutput()
	
	if err != nil {
		return generated.MacroExecutionResult{
			Success: false,
			Output:  string(out) + "\nError: " + err.Error(),
		}, nil
	}

	return generated.MacroExecutionResult{
		Success: true,
		Output:  string(out),
	}, nil
}

func ExecuteCommand(command string) (generated.MacroExecutionResult, error) {
	cmd := exec.Command("bash", "-c", command)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return generated.MacroExecutionResult{
			Success: false,
			Output:  string(out) + "\nError: " + err.Error(),
		}, nil
	}
	return generated.MacroExecutionResult{
		Success: true,
		Output:  string(out),
	}, nil
}

