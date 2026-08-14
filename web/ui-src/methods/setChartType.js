  setChartType(chartType){
    this.set({ chartType: chartType });
    if (this.postChartOptions) this.postChartOptions({ chartType: chartType });
  }
