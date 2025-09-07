# Unstage and remove from git index files that should be ignored now
# Run from repository root. This script only removes files from the git index
# (so they remain on disk) using `git rm --cached`. It will not delete working files.
# Review the list before confirming.

$patterns = @(
    "*.keras",
    "*.h5",
    "*.pb",
    "*.onnx",
    "*.tflite",
    "*.traineddata",
    "apks/*",
    "machine_learning/output/*",
    "machine_learning/generated/*",
    "machine_learning/samples/*",
    "machine_learning/seven_segment_dataset/images/*",
    "models/*",
    "data/*",
    "samples/*",
    "build-log.txt",
    "*_training_results*.json",
    "*_training_log*.csv",
    "v3_integration_test_*.json"
)

Write-Host "The following patterns will be unstaged (git rm --cached). Files will remain on disk."
$patterns | ForEach-Object { Write-Host " - $_" }

$confirm = Read-Host "Proceed with unstage? (y/N)"
if ($confirm -ne 'y') {
    Write-Host "Aborted. No changes made."
    exit 0
}

# For each pattern, find matching tracked files and remove them from the index
foreach ($p in $patterns) {
    $matchedFiles = git ls-files -- "${p}"
    if ($matchedFiles) {
        Write-Host "Removing from index: $p"
        git rm --cached --force -- $matchedFiles
    }
}

Write-Host "Done. You can now commit the updated .gitignore and index changes." 
Write-Host "Suggested next commands:"
Write-Host "  git add .gitignore scripts/unstage_generated_files.ps1"
Write-Host "  git commit -m 'Ignore generated ML data, models, apks and logs; unstage existing artifacts'"
