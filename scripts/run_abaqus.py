import os
import sys
import subprocess
import glob
import time
from pathlib import Path

def check_completion_status(run_path, job_name):
    """Check if a specific job completed successfully"""
    # Check for .sta, .dat, and .odb files
    required_extensions = ['.sta', '.dat', '.odb']
    for ext in required_extensions:
        if not os.path.exists(os.path.join(run_path, job_name + ext)):
            return False
    
    # Check .sta file for completion message
    sta_file = os.path.join(run_path, job_name + '.sta')
    try:
        with open(sta_file, 'r') as f:
            content = f.read()
            if 'COMPLETED' in content and 'ABORTED' not in content:
                return True
    except Exception as e:
        print(f"Error reading .sta file: {str(e)}")
    return False

def run_abaqus_job(job_name, run_path, inp_file, prev_job=None):
    """Run a single Abaqus job with proper error handling"""
    abaqus_cmd = r"D:\SIMULIA\Commands\abaqus.bat"
    
    cmd = [abaqus_cmd, 
           'job=' + job_name,
           'input=' + inp_file]
    
    if prev_job:
        cmd.append('oldjob=' + prev_job)
    
    cmd.append('int')  # Use interactive mode
    
    print(f"\nStarting Abaqus job: {job_name}")
    print(f"Working directory: {run_path}")
    print(f"Command: {' '.join(cmd)}")
    
    try:
        # First verify input files exist
        if not os.path.exists(os.path.join(run_path, inp_file)):
            raise FileNotFoundError(f"Input file {inp_file} not found")
        if not os.path.exists(os.path.join(run_path, 'parameters.inc')):
            raise FileNotFoundError("parameters.inc not found")
        if not os.path.exists(abaqus_cmd):
            raise FileNotFoundError(f"Abaqus command not found at: {abaqus_cmd}")

        print("All required files found, launching Abaqus...")

        # Run Abaqus command with output capture
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=run_path,
            text=True,
            shell=True
        )

        # Monitor the process with timeout and capture output
        start_time = time.time()
        while True:
            try:
                stdout, stderr = process.communicate(timeout=5)
                if stdout:
                    print("Process output:", stdout)
                if stderr:
                    print("Process errors:", stderr)
                    
                return_code = process.returncode
                print(f"Process completed with return code: {return_code}")
                
                if return_code != 0:
                    print(f"Warning: Process returned non-zero exit code: {return_code}")
                break
                
            except subprocess.TimeoutExpired:
                # Check if process is still running
                try:
                    os.kill(process.pid, 0)
                    elapsed_time = time.time() - start_time

                except OSError as e:
                    print(f"Process terminated unexpectedly: {str(e)}")
                    return False
                    
                # Update status
                with open(os.path.join(run_path, 'analysis_status.txt'), 'w') as f:
                    f.write(f"Running - {elapsed_time:.1f}s")

        # Process completed, check the outcome
        if check_completion_status(run_path, job_name):
            print(f"Job {job_name} completed successfully")
            with open(os.path.join(run_path, 'analysis_status.txt'), 'w') as f:
                f.write("Completed")
            return True
        else:
            print(f"Job {job_name} failed completion check")
            with open(os.path.join(run_path, 'analysis_status.txt'), 'w') as f:
                f.write("Error - Failed completion check")
            return False

    except Exception as e:
        import traceback
        print(f"Error running job {job_name}:")
        print(traceback.format_exc())
        with open(os.path.join(run_path, 'analysis_status.txt'), 'w') as f:
            f.write(f"Error - {str(e)}")
        return False

def run_analysis(project_path, single_run=None):
    try:
        print(f"Starting analysis in: {project_path}")
        
        # If single_run is specified, only process that run
        if single_run:
            run_folders = [single_run]
            run_path = os.path.join(project_path, single_run)
            if not os.path.exists(run_path):
                print(f"Run folder {run_path} does not exist")
                return False
        else:
            run_folders = sorted([d for d in os.listdir(project_path) 
                                if os.path.isdir(os.path.join(project_path, d))], key=int)
        
        for run in run_folders:
            run_path = os.path.join(project_path, run)
            print(f"\nProcessing run folder: {run_path}")
            
            # Check if this run is already completed
            sta_files = glob.glob(os.path.join(run_path, '*.sta'))
            if len(sta_files) == 7:
                print(f"Run {run} already completed (found 7 .sta files), skipping...")
                with open(os.path.join(run_path, 'analysis_status.txt'), 'w') as f:
                    f.write("Completed")
                continue

            # Mark as running
            with open(os.path.join(run_path, 'analysis_status.txt'), 'w') as f:
                f.write("Running")
            
            # Define analysis sequence
            analysis_sequence = [
                ('tiretransfer_axi_half', None),
                ('tiretransfer_symmetric', 'tiretransfer_axi_half'),
                ('tiretransfer_full', 'tiretransfer_symmetric'),
                ('rollingtire_brake_trac', 'tiretransfer_full'),
                ('rollingtire_brake_trac1', 'rollingtire_brake_trac'),
                ('rollingtire_freeroll', 'rollingtire_brake_trac1')
            ]

            # Process each step
            for current_step, prev_step in analysis_sequence:
                job_name = f"Run_{run}_{current_step}"
                inp_file = f"{current_step}.inp"
                prev_job = f"Run_{run}_{prev_step}" if prev_step else None
                
                success = run_abaqus_job(job_name, run_path, inp_file, prev_job)
                
                # After each step, check total .sta files
                sta_files = glob.glob(os.path.join(run_path, '*.sta'))
                
                if len(sta_files) == 7:
                    # All jobs completed successfully
                    with open(os.path.join(run_path, 'analysis_status.txt'), 'w') as f:
                        f.write("Completed")
                elif not success:
                    # Job failed
                    with open(os.path.join(run_path, 'analysis_status.txt'), 'w') as f:
                        f.write("Error")
                    break
                else:
                    # Still running
                    with open(os.path.join(run_path, 'analysis_status.txt'), 'w') as f:
                        f.write("Running")

        return True
    except Exception as e:
        print(f"Fatal error in analysis: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python run_abaqus.py <project_path> [run_number]")
        sys.exit(1)
    
    project_path = sys.argv[1]
    single_run = sys.argv[2] if len(sys.argv) > 2 else None
    print(f"Received project path: {project_path}")
    if single_run:
        print(f"Processing single run: {single_run}")
    success = run_analysis(project_path, single_run)
    sys.exit(0 if success else 1)
