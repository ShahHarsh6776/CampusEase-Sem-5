# 🔥 **GPU Performance Monitor for RTX 3050**

import subprocess
import json
import time
from typing import Dict, List

class GPUMonitor:
    """Monitor RTX 3050 GPU usage and performance metrics"""
    
    def __init__(self):
        self.gpu_id = 0  # RTX 3050 is GPU 0
    
    def get_gpu_stats(self) -> Dict:
        """Get current GPU utilization, memory, and temperature"""
        try:
            # Query GPU stats using nvidia-ml-py or nvidia-smi
            result = subprocess.run([
                'nvidia-smi', 
                '--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw',
                '--format=csv,noheader,nounits'
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                stats = result.stdout.strip().split(',')
                return {
                    'gpu_utilization': int(stats[0]),  # %
                    'memory_used': int(stats[1]),      # MB
                    'memory_total': int(stats[2]),     # MB  
                    'temperature': int(stats[3]),      # °C
                    'power_draw': float(stats[4]),     # W
                    'memory_utilization': round((int(stats[1]) / int(stats[2])) * 100, 1)
                }
        except Exception as e:
            print(f"Error getting GPU stats: {e}")
        
        return None
    
    def monitor_during_processing(self, duration: int = 10) -> List[Dict]:
        """Monitor GPU during face recognition processing"""
        stats_history = []
        start_time = time.time()
        
        print("🔥 Starting GPU monitoring...")
        print("📊 Time | GPU% | VRAM | Temp | Power")
        print("-" * 45)
        
        while time.time() - start_time < duration:
            stats = self.get_gpu_stats()
            if stats:
                stats['timestamp'] = time.time()
                stats_history.append(stats)
                
                print(f"⏱️ {len(stats_history):3d}s | "
                      f"{stats['gpu_utilization']:3d}% | "
                      f"{stats['memory_used']:4d}MB | "
                      f"{stats['temperature']:2d}°C | "
                      f"{stats['power_draw']:4.1f}W")
            
            time.sleep(1)
        
        return stats_history
    
    def get_gpu_status(self) -> Dict:
        """Alias for get_gpu_stats for compatibility"""
        return self.get_gpu_stats()
    
    def get_optimal_settings(self) -> Dict:
        """Get optimal settings for RTX 3050"""
        return {
            'batch_size': 8,           # Optimal batch size for 4GB VRAM
            'det_size': (640, 640),    # Good balance of speed/accuracy
            'gpu_mem_limit': 2048,     # 2GB limit, leave room for system
            'max_concurrent_faces': 10 # Process up to 10 faces simultaneously
        }

# Usage example:
if __name__ == "__main__":
    monitor = GPUMonitor()
    
    # Check current GPU status
    stats = monitor.get_gpu_stats()
    if stats:
        print("🚀 RTX 3050 Status:")
        print(f"   GPU Utilization: {stats['gpu_utilization']}%")
        print(f"   VRAM Usage: {stats['memory_used']}/{stats['memory_total']} MB ({stats['memory_utilization']}%)")
        print(f"   Temperature: {stats['temperature']}°C")
        print(f"   Power Draw: {stats['power_draw']}W")
    
    # Get optimal settings
    settings = monitor.get_optimal_settings()
    print(f"\n⚡ Recommended Settings:")
    for key, value in settings.items():
        print(f"   {key}: {value}")