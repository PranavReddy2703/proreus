package power

import (
	"fmt"
	"os"
	"os/exec"
)

func ExecuteAction(action string) error {
	dryRun := os.Getenv("PROREUS_DEV_MODE") == "true"
	if dryRun {
		fmt.Printf("[DRY RUN] Would execute power action: %s\n", action)
		return nil
	}
	
	switch action {
	case "reboot":
		return exec.Command("sudo", "reboot").Run()
	case "shutdown":
		return exec.Command("sudo", "shutdown", "-h", "now").Run()
	default:
		return fmt.Errorf("unknown action: %s", action)
	}
}
