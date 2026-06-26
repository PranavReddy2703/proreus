package api

import (
	"github.com/labstack/echo/v4"
	"github.com/PranavReddy2703/proreus/agent/internal/api/generated"
	"github.com/PranavReddy2703/proreus/agent/internal/power"
	"github.com/PranavReddy2703/proreus/agent/internal/system"
)

type Server struct{}

func (s *Server) GetHealth(ctx echo.Context) error {
	return ctx.JSON(200, generated.HealthStatus{
		Status:  generated.Ok,
		Version: "1.0.0",
	})
}

func (s *Server) GetSystemMetrics(ctx echo.Context) error {
	metrics, err := system.GetMetrics()
	if err != nil {
		return ctx.JSON(500, generated.ErrorResponse{Message: err.Error()})
	}
	return ctx.JSON(200, metrics)
}

func (s *Server) ExecutePowerAction(ctx echo.Context) error {
	var req generated.PowerActionRequest
	if err := ctx.Bind(&req); err != nil {
		return ctx.JSON(400, generated.ErrorResponse{Message: "Invalid request"})
	}
	
	err := power.ExecuteAction(string(req.Action))
	if err != nil {
		return ctx.JSON(500, generated.ErrorResponse{Message: err.Error()})
	}
	
	return ctx.JSON(200, map[string]string{"message": "Action initiated"})
}

func (s *Server) GetSystemDockerContainers(ctx echo.Context) error {
	containers, err := system.GetDockerContainers()
	if err != nil {
		return ctx.JSON(500, generated.ErrorResponse{Message: err.Error()})
	}
	return ctx.JSON(200, containers)
}

func (s *Server) ExecuteDockerContainerAction(ctx echo.Context, id string) error {
	var req generated.DockerActionRequest
	if err := ctx.Bind(&req); err != nil {
		return ctx.JSON(400, generated.ErrorResponse{Message: "Invalid request"})
	}
	
	resp, err := system.ExecuteDockerAction(id, string(req.Action))
	if err != nil {
		return ctx.JSON(500, generated.ErrorResponse{Message: err.Error()})
	}
	
	return ctx.JSON(200, resp)
}

func (s *Server) GetSystemDockerContainerLogs(ctx echo.Context, id string) error {
	logs, err := system.GetDockerContainerLogs(id)
	if err != nil {
		return ctx.JSON(500, generated.ErrorResponse{Message: err.Error()})
	}
	return ctx.JSON(200, logs)
}

func (s *Server) GetSystemLogs(ctx echo.Context) error {
	logs, err := system.GetSystemLogs()
	if err != nil {
		return ctx.JSON(500, generated.ErrorResponse{Message: err.Error()})
	}
	return ctx.JSON(200, logs)
}

func (s *Server) GetSystemMacros(ctx echo.Context) error {
	macros := system.GetMacros()
	return ctx.JSON(200, macros)
}

func (s *Server) CreateSystemMacro(ctx echo.Context) error {
	var input generated.MacroInput
	if err := ctx.Bind(&input); err != nil {
		return ctx.JSON(400, generated.ErrorResponse{Message: "Invalid request"})
	}
	macro := system.CreateMacro(input)
	return ctx.JSON(200, macro)
}

func (s *Server) DeleteSystemMacro(ctx echo.Context, id string) error {
	success := system.DeleteMacro(id)
	return ctx.JSON(200, map[string]bool{"success": success})
}

func (s *Server) ExecuteSystemMacro(ctx echo.Context, id string) error {
	result, err := system.ExecuteMacro(id)
	if err != nil {
		return ctx.JSON(404, generated.ErrorResponse{Message: err.Error()})
	}
	return ctx.JSON(200, result)
}

func (s *Server) ExecuteSystemCommand(ctx echo.Context) error {
	var body struct {
		Command string `json:"command"`
	}
	if err := ctx.Bind(&body); err != nil {
		return ctx.JSON(400, generated.ErrorResponse{Message: "Invalid request"})
	}
	
	result, err := system.ExecuteCommand(body.Command)
	if err != nil {
		return ctx.JSON(500, generated.ErrorResponse{Message: err.Error()})
	}
	return ctx.JSON(200, result)
}



