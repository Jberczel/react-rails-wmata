// wmata ojbect used to sort ajax request by stations (west to east / south to north)
var WMATA = {
   OR: ["K08", "K07", "K06", "K05", "K04", "K03", "K02", "K01", "C05", "C04", "C03", "C02", "C01", "D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08", "D09", "D10", "D11", "D12", "D13"],
   BL: ["J03", "J02", "C13", "C12", "C11", "C10", "C09", "C08", "C07", "C06", "C05", "C04", "C03", "C02", "C01", "D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08", "G01", "G02", "G03", "G04", "G05"],
   YL: ["C15", "C14", "C13", "C12", "C11", "C10", "C09", "C08", "C07", "F03", "F02", "F01", "E01", "E02", "E03", "E04", "E05", "E06", "E07", "E08", "E09", "E10"],
   SV: ["N06", "N04", "N03", "N02", "N01", "K05", "K04", "K03", "K02", "K01", "C05", "C04", "C03", "C02", "C01", "D01", "D02", "D03", "D04", "D05", "D06", "D07", "D08", "G01", "G02", "G03", "G04", "G05"],
   GR: ["F11", "F10", "F09", "F08", "F07", "F06", "F05", "F04", "F03", "F02", "F01", "E01", "E02", "E03", "E04", "E05", "E06", "E07", "E08", "E09", "E10"],
   RD: ["A15", "A14", "A13", "A12", "A11", "A10", "A09", "A08", "A07", "A06", "A05", "A04", "A03", "A02", "A01", "B01", "B02", "B03", "B35", "B04", "B05", "B06", "B07", "B08", "B09", "B10", "B11"],
};



var FilterButton = React.createClass({
  handleClick: function(e) {
    e.preventDefault();
    this.props.onUserInput(this.props.text);
  },
  render: function() {
    return(<button className={"nav-btn " + this.props.text} onClick={this.handleClick}>{this.props.text}</button>);
  }
});

var FilterOptions = React.createClass({
  handleClick: function(line) {
    this.props.onUserInput(line);
  },
  render: function() {
    var line_buttons = this.props.buttons.map(function(line) {
      return <FilterButton onUserInput={this.handleClick} text={line} />
    }.bind(this));
    return (
      <div className="navigation">
        <h2 className="header">DC Metro Lines</h2>
        <p className="updated-time">Last Updated: {moment().format('MMMM Do, h:mm:ss a')}</p>
        <p>Live updates every 20 seconds</p>
          {line_buttons}
      </div>
    );
  }
});

var Train = React.createClass({
  isArrivingBoarding: function() {
    return this.props.minutes === "ARR" ||
           this.props.minutes === "BRD";
  },
  isClose: function() {
    return parseInt(this.props.minutes) <= 3;
  },
  render: function() {
    var minuteClasses = "minutes";
    if (this.isArrivingBoarding()) {
      minuteClasses += " blink-me";
    } else {
      minuteClasses += this.isClose() ? " close-train" : " far-train";
    }
    return (
      <tr className="train">
        <td className={"line " + this.props.line}>
          { this.props.icon ? <i className='fa fa-circle fa-lg'/> : "" }
        </td>
        <td className="station">{this.props.station}</td>
        <td className="destination">{this.props.destination}</td>
        <td className={minuteClasses}>{this.props.minutes}</td>
      </tr>
    );
  }
});

var TrainList = React.createClass({
  render: function() {
    var rows = [];
    var lastStation = null;
    this.props.data.forEach(function(train) {
      if (train.LocationName !== lastStation) {
        rows.push(<Train icon={true} station={train.LocationName } line={train.Line} destination={train.Destination} minutes={train.Min} />);
        lastStation = train.LocationName;
      } else {
        rows.push(<Train station={""} line={train.Line} destination={train.Destination} minutes={train.Min} />);
      }
    });
    return (
      <tbody className="train-list">
        {rows}
      </tbody>
    );
  }
});

var WmataSchedule = React.createClass({
  getInitialState: function() {
    return {data: [], line: "OR"};
  },
  sortTrainData: function(data) {
    var lineColor = this.state.line,
        stations  = WMATA[lineColor];
    data = data.filter(function(train) { return train["Line"] === lineColor });
    return data.sort(function(a,b) {
       if (stations.indexOf(a.LocationCode) - stations.indexOf(b.LocationCode) == 0) {
         return a.Destination.localeCompare(b.Destination);
       }
       else {
         return stations.indexOf(a.LocationCode) - stations.indexOf(b.LocationCode);
       }
     });
  },
  loadTrainsFromServer: function() {
    var lineString = WMATA[this.state.line].join(",");
    var url = "https://api.wmata.com/StationPrediction.svc/json/GetPrediction/" + lineString + "?api_key=" + this.props.api_key;
    $.ajax({
      url: url,
      dataType: 'json',
      success: function(data) {
        this.setState({data: this.sortTrainData(data["Trains"])});
      }.bind(this),
      error: function(xhr, status, err) {
        //alert("Sorry, WMATA quota exceeded!");
        console.error(url, status, err.toString());
      }.bind(this)
    });
  },
  handleClick: function(user_selected_line) {
    this.setState({line: user_selected_line}, this.loadTrainsFromServer);
  },
  componentDidMount: function() {
    this.loadTrainsFromServer();
    setInterval(this.loadTrainsFromServer, this.props.pollInterval);
  },
  render: function() {
    return (
      <div className='next-train-filterable'>
        <FilterOptions onUserInput={this.handleClick} buttons={["OR","BL","RD","GR","SV","YL"]} />
        <table className="next-train-table">
          <thead>
            <tr>
              <th className="line">Line</th>
              <th className="station">Station</th>
              <th className="destination">Destination</th>
              <th className="minutes">Min</th>
            </tr>
          </thead>
          <TrainList data={this.state.data} />
        </table>
      </div>
    );
  }
});
