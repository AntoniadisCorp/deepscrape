SHELL := /bin/sh

FUNCTIONS_DIR := functions
IP2LOCATION_BIN := $(FUNCTIONS_DIR)/databases/IP2LOCATION-LITE-DB11.BIN
MIGRATE_ENV_SCRIPT := $(FUNCTIONS_DIR)/scripts/migrate-env-to-json.cjs
DEPLOY_JSON_SCRIPT := $(FUNCTIONS_DIR)/scripts/deploy-with-json-config.cjs

.PHONY: help lfs-install lfs-pull lfs-status lfs-refresh lfs-stage-bin ip2location-check ip2location-refresh ip2location-sync env-json deploy-json

help:
	@echo "Available targets:"
	@echo "  make lfs-install         - Install Git LFS hooks locally"
	@echo "  make lfs-pull            - Pull LFS files for the current checkout"
	@echo "  make lfs-status          - Show Git LFS tracked files status"
	@echo "  make lfs-refresh         - Install LFS hooks and pull the latest LFS content"
	@echo "  make lfs-stage-bin       - Stage the local IP2Location BIN into Git LFS/Git index"
	@echo "  make ip2location-check   - Verify the IP2Location BIN exists locally"
	@echo "  make env-json            - Run functions migrate-env-to-json script"
	@echo "  make ip2location-refresh - Pull LFS BIN and sync checksum/upload via migrate script"
	@echo "  make ip2location-sync    - Stage changed local BIN in Git LFS and sync checksum/upload"
	@echo "  make deploy-json         - Push FUNCTIONS_ENV_JSON and deploy using deploy-with-json-config script"

lfs-install:
	git lfs install --local

lfs-pull:
	git lfs pull

lfs-status:
	git lfs ls-files

lfs-refresh: lfs-install lfs-pull

lfs-stage-bin: ip2location-check
	git add .gitattributes "$(IP2LOCATION_BIN)"
	@echo "Staged $(IP2LOCATION_BIN) for Git LFS commit"

ip2location-check:
	@test -f "$(IP2LOCATION_BIN)" || (echo "Missing $(IP2LOCATION_BIN)" && exit 1)
	@echo "Found $(IP2LOCATION_BIN)"

env-json:
	node "$(MIGRATE_ENV_SCRIPT)"

ip2location-refresh: lfs-refresh ip2location-check env-json
	@echo "IP2Location BIN synced and env JSON refreshed"

ip2location-sync: lfs-stage-bin env-json
	@echo "Local BIN staged in Git LFS and storage/checksum refreshed"

deploy-json:
	node "$(DEPLOY_JSON_SCRIPT)"
