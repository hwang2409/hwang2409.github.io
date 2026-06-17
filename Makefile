SHELL := /bin/bash

.DEFAULT_GOAL := dev

PYTHON ?= python3
BACKEND_HOST ?= 127.0.0.1
BACKEND_PORT ?= 8000
FRONTEND_PORT ?= 3000

BACKEND_VENV := backend/.venv
BACKEND_PYTHON := $(BACKEND_VENV)/bin/python
BACKEND_UVICORN := $(BACKEND_VENV)/bin/uvicorn
NODE_MODULES := node_modules/.package-lock.json
LOCAL_API_URL ?= http://$(BACKEND_HOST):$(BACKEND_PORT)

.PHONY: help dev backend frontend backend-install frontend-install install clean-backend

help:
	@echo "make dev             start backend and frontend"
	@echo "make backend         start FastAPI on $(LOCAL_API_URL)"
	@echo "make frontend        start Next on http://localhost:$(FRONTEND_PORT)"
	@echo "make install         install frontend and backend dependencies"
	@echo "make clean-backend   remove backend virtualenv"

dev: backend-install frontend-install
	@set -e; \
	echo "backend  $(LOCAL_API_URL)"; \
	echo "frontend http://localhost:$(FRONTEND_PORT)"; \
	backend_pid=""; \
	frontend_pid=""; \
	cleanup() { \
		if [ -n "$$backend_pid" ]; then kill "$$backend_pid" 2>/dev/null || true; fi; \
		if [ -n "$$frontend_pid" ]; then kill "$$frontend_pid" 2>/dev/null || true; fi; \
		wait 2>/dev/null || true; \
	}; \
	trap cleanup INT TERM EXIT; \
	$(BACKEND_UVICORN) app.main:app --app-dir backend --reload --host $(BACKEND_HOST) --port $(BACKEND_PORT) & \
	backend_pid=$$!; \
	NEXT_PUBLIC_LAB_API_URL=$(LOCAL_API_URL) npm run dev -- --port $(FRONTEND_PORT) & \
	frontend_pid=$$!; \
	while kill -0 "$$backend_pid" 2>/dev/null && kill -0 "$$frontend_pid" 2>/dev/null; do \
		sleep 1; \
	done; \
	echo "one service exited; stopping local dev"; \
	exit 1

backend: backend-install
	$(BACKEND_UVICORN) app.main:app --app-dir backend --reload --host $(BACKEND_HOST) --port $(BACKEND_PORT)

frontend:
	NEXT_PUBLIC_LAB_API_URL=$(LOCAL_API_URL) npm run dev -- --port $(FRONTEND_PORT)

backend-install: $(BACKEND_UVICORN)

frontend-install: $(NODE_MODULES)

$(BACKEND_UVICORN): backend/requirements.txt
	$(PYTHON) -m venv $(BACKEND_VENV)
	$(BACKEND_PYTHON) -m pip install --upgrade pip
	$(BACKEND_PYTHON) -m pip install -r backend/requirements.txt

$(NODE_MODULES): package-lock.json
	npm install

install: backend-install frontend-install

clean-backend:
	rm -rf $(BACKEND_VENV)
