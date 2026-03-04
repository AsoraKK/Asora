#!/bin/bash
cd /home/kylee/asora
export GIT_EDITOR=:
git rebase --abort 2>/dev/null || true
git status
git add -A
git commit -m "Update changes" || true
git push
