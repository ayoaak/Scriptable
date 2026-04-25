/*
 * @author: 2Ya&脑瓜 (Modified for ChinaTelecomMonitor By @ayoaak)
 * https://github.com/Cp0204/ChinaTelecomMonitor
 * https://github.com/ayoaak/Scriptable
 * version: 114.5.14
 * 原创UI，修改套用请注明来源
*/

if (typeof require === 'undefined') require = importModule;
const {DmYY, Runing} = require('./DmYY');

class Widget extends DmYY {
  constructor(arg) {
    super(arg);
    this.name = "中国电信";
    this.en = "ChinaTelecom_Ultimate";
    this.logo = "https://raw.githubusercontent.com/anker1209/icon/main/zgdx-big.png";
    this.smallLogo = "https://raw.githubusercontent.com/anker1209/icon/main/zgdx.png";
    this.Run();
  }
  
  version = '4.0.2';
  gradient = false;
  flowColorHex = "#FF6620";
  voiceColorHex = "#78C100";

  ringStackSize = 65;
  ringTextSize = 14;
  feeTextSize = 21;
  textSize = 13;
  smallPadding = 12;
  padding = 10;
  logoScale = 0.24;
  SCALE = 1;
  canvSize = 178;
  canvWidth = 18;
  canvRadius = 80;
  widgetStyle = '1';

  format = (str) => {
    return parseInt(str) >= 10 ? str : `0${str}`;
  };

  date = new Date();
  arrUpdateTime = [
    this.format(this.date.getMonth() + 1),
    this.format(this.date.getDate()),
    this.format(this.date.getHours()),
    this.format(this.date.getMinutes()),
  ];

  fee = {
    title: "剩余话费",
    icon: 'antenna.radiowaves.left.and.right',
    number: '0.00',
    iconColor: new Color('#0C54D9'),
    unit: "元",
    en: "¥",
  };

  flow = {
    percent: 0,
    title: "剩余流量",
    number: '0',
    unit: "GB",
    en: "GB",
    icon: "antenna.radiowaves.left.and.right",
    iconColor: new Color("#FF6620"),
    FGColor: new Color(this.flowColorHex),
    BGColor: new Color(this.flowColorHex, 0.2),
    colors: [],
  };

  voice = {
    percent: 0,
    title: "剩余语音",
    number: '0',
    unit: "分钟",
    en: "MIN",
    icon: 'phone.badge.waveform.fill',
    iconColor: new Color("#78C100"),
    FGColor: new Color(this.voiceColorHex),
    BGColor: new Color(this.voiceColorHex, 0.2),
    colors: [],
  };

  point = {
    title: "更新时间",
    number: `${this.arrUpdateTime[2]}:${this.arrUpdateTime[3]}`,
    unit: "",
    icon: "arrow.2.circlepath",
    iconColor: new Color("fc6d6d"),
  };

  init = async () => {
    try {
      const scale = this.getWidgetScaleFactor();
      this.SCALE = this.settings.SCALE || scale;

      const {
        step1,
        step2,
        logoColor,
        flowIconColor,
        voiceIconColor,
        gradient,
        widgetStyle,
        builtInColor,
      } = this.settings;

      this.gradient = gradient === 'true';

      if (builtInColor === 'true') {
        const [feeColor, flowColor, voiceColor] = this.getIconColorSet();
        this.fee.iconColor = new Color(feeColor);
        this.flow.iconColor = new Color(flowColor);
        this.voice.iconColor = new Color(voiceColor);
      } else {
        this.fee.iconColor = logoColor ? new Color(logoColor) : this.fee.iconColor;
        this.flow.iconColor = flowIconColor ? new Color(flowIconColor) : this.flow.iconColor;
        this.voice.iconColor = voiceIconColor ? new Color(voiceIconColor) : this.voice.iconColor;
      }

      this.flowColorHex = step1 || this.flowColorHex;
      this.voiceColorHex = step2 || this.voiceColorHex;
      this.flow.BGColor = new Color(this.flowColorHex, 0.2);
      this.voice.BGColor = new Color(this.voiceColorHex, 0.2);
      this.flow.FGColor = new Color(this.flowColorHex);
      this.voice.FGColor = new Color(this.voiceColorHex);

      this.widgetStyle = widgetStyle || this.widgetStyle;

      const sizeSettings = ['ringStackSize', 'ringTextSize', 'feeTextSize', 'textSize', 'smallPadding', 'padding'];
      for (const key of sizeSettings) {
        this[key] = this.settings[key] ? parseFloat(this.settings[key]) : this[key];
        this[key] = this[key] * this.SCALE;
      }

      if (this.gradient) {
        this.flow.colors = this.arrColor();
        this.voice.colors = this.arrColor();
        this.flow.BGColor = new Color(this.flow.colors[1], 0.2);
        this.voice.BGColor = new Color(this.voice.colors[1], 0.2);
        this.flow.FGColor = this.gradientColor(this.flow.colors, 360);
        this.voice.FGColor = this.gradientColor(this.voice.colors, 360);
        this.flowColorHex = this.flow.colors[1];
        this.voiceColorHex = this.voice.colors[1];
      }
    } catch (e) {
      console.error("UI 初始化错误: " + e);
    }
    
    if (!this.settings.dataSource) {
      await this.getData();
    } else {
      const cache = this.settings.dataSource;
      if (cache.fee) this.fee.number = cache.fee.number;
      if (cache.flow) {
        this.flow.number = cache.flow.number;
        this.flow.percent = cache.flow.percent;
        this.flow.unit = cache.flow.unit;
        this.flow.en = cache.flow.en;
      }
      if (cache.voice) {
        this.voice.number = cache.voice.number;
        this.voice.percent = cache.voice.percent;
      }
      this.getData();
    }
  };

  getData = async () => {
    const requestUrl = this.settings.custom_api_url;

    if (!requestUrl) {
      return this.notify("配置缺失", "请点击组件，在【API配置】中粘贴你的自定义请求链接");
    }

    try {
      console.log(`发起主动拉取请求: ${requestUrl}`);
      const response = await this.http({ url: requestUrl });
      
      if (!response || response.headerInfos.code !== "0000") {
        throw "接口返回错误";
      }

      const data = response.responseData.data;

      this.fee.number = data.balanceInfo.indexBalanceDataInfo.balance;

      if (data.flowInfo && data.flowInfo.flowList && data.flowInfo.flowList.length > 0) {
        const flowItem = data.flowInfo.flowList[0];
        const remStr = flowItem.rightTitleHh;         
        const totalStr = flowItem.rightTitleEnd;      
        
        const remNum = parseFloat(remStr.replace(/GB|MB/g, '')) || 0;
        const totalNum = parseFloat(totalStr.replace(/\/|GB|MB/g, '')) || 1; 
        
        this.flow.number = remNum.toString();
        this.flow.unit = remStr.includes('GB') ? 'GB' : 'MB';
        this.flow.en = this.flow.unit;
        this.flow.percent = ((remNum / totalNum) * 100).toFixed(1);
      }

      if (data.voiceInfo && data.voiceInfo.voiceBars && data.voiceInfo.voiceBars.length > 0) {
        const voiceItem = data.voiceInfo.voiceBars[0];
        const remStr = voiceItem.rightTitleHh;        
        const totalStr = voiceItem.rightTitleEnd;     
        
        const remNum = parseFloat(remStr.replace('分钟', '')) || 0;
        const totalNum = parseFloat(totalStr.replace(/\//g, '').replace('分钟', '')) || 1;
        
        this.voice.number = remNum.toString();
        this.voice.percent = ((remNum / totalNum) * 100).toFixed(1);
      }
      
      this.settings.dataSource = {
        fee: { number: this.fee.number },
        flow: { 
          number: this.flow.number, 
          percent: this.flow.percent, 
          unit: this.flow.unit, 
          en: this.flow.en 
        },
        voice: { 
          number: this.voice.number, 
          percent: this.voice.percent 
        }
      };
      this.saveSettings(false);
      console.log("数据更新成功！");

    } catch (e) {
      console.error("网络请求或数据解析失败: " + e);
    }
  };

  async header(stack) {
    const headerStack = stack.addStack();
    headerStack.addSpacer();
    const logo = headerStack.addImage(await this.$request.get(this.logo, 'IMG'));
    logo.imageSize = new Size(415 * this.logoScale * this.SCALE, 125 * this.logoScale * this.SCALE);
    headerStack.addSpacer();
    stack.addSpacer();

    const feeStack = stack.addStack();
    feeStack.centerAlignContent();
    feeStack.addSpacer();
    const feeValue = feeStack.addText(`${this.fee.number}`);
    this.unit(feeStack, '元', 5 * this.SCALE, this.widgetColor);
    feeValue.font = Font.mediumRoundedSystemFont(this.feeTextSize);
    feeValue.textColor = this.widgetColor;
    feeStack.addSpacer();
    stack.addSpacer();
  };

  textLayout(stack, data) {
    const rowStack = stack.addStack();
    rowStack.centerAlignContent();
    const icon = SFSymbol.named(data.icon) || SFSymbol.named('phone.fill');
    icon.applyHeavyWeight();
    let iconElement = rowStack.addImage(icon.image);
    iconElement.imageSize = new Size(this.textSize, this.textSize);
    iconElement.tintColor = data.iconColor;
    rowStack.addSpacer(4 * this.SCALE);
    let title = rowStack.addText(data.title);
    rowStack.addSpacer();
    let number = rowStack.addText(data.number + data.unit);
    [title, number].map(t => t.textColor = this.widgetColor);
    [title, number].map(t => t.font = Font.systemFont(this.textSize * this.SCALE));
  };

  async setThirdWidget(widget) {
    const amountStack = widget.addStack();
    amountStack.centerAlignContent();
    const icon = await this.$request.get(this.smallLogo, 'IMG');

    if (this.settings.builtInColor === 'true') {
      const iconStack = amountStack.addStack();
      iconStack.setPadding(4 * this.SCALE, 4 * this.SCALE, 4 * this.SCALE, 4 * this.SCALE);
      iconStack.backgroundColor = this.fee.iconColor;
      iconStack.cornerRadius = 12 * this.SCALE;
      const iconImage = iconStack.addImage(icon);
      iconImage.imageSize = new Size(16 * this.SCALE, 16 * this.SCALE);
      iconImage.tintColor = Color.white();
    } else {
      const iconImage = amountStack.addImage(icon);
      iconImage.imageSize = new Size(24 * this.SCALE, 24 * this.SCALE);
    }

    amountStack.addSpacer();
    const amountText = amountStack.addText(`${this.fee.number}`);
    amountText.font = Font.boldRoundedSystemFont(24 * this.SCALE);
    amountText.minimumScaleFactor = 0.5;
    amountText.textColor = this.widgetColor;
    this.unit(amountStack, '元', 7 * this.SCALE);
    widget.addSpacer();

    const mainStack = widget.addStack();
    this.setRow(mainStack, this.flow, this.flowColorHex);
    mainStack.addSpacer();
    this.setRow(mainStack, this.voice, this.voiceColorHex);
  };

  async setForthWidget(widget) {
    const bodyStack = widget.addStack();
    bodyStack.cornerRadius = 14 * this.SCALE;
    bodyStack.layoutVertically();
    const headerStack = bodyStack.addStack();
    headerStack.setPadding(8 * this.SCALE, 12 * this.SCALE, 0, 12 * this.SCALE);
    headerStack.layoutVertically();
    const title = headerStack.addText(this.fee.title);
    title.font = Font.systemFont(12 * this.SCALE);
    title.textColor = this.widgetColor
    title.textOpacity = 0.7;
    const balanceStack = headerStack.addStack();
    const balanceText = balanceStack.addText(`${this.fee.number}`);
    balanceText.minimumScaleFactor = 0.5;
    balanceText.font = Font.boldRoundedSystemFont(22 * this.SCALE);
    const color = this.widgetColor;
    balanceText.textColor = color;
    this.unit(balanceStack, '元', 5 * this.SCALE, color);
    balanceStack.addSpacer();
    balanceStack.centerAlignContent();
  
    const icon = await this.$request.get(this.smallLogo, 'IMG');

    if (this.settings.builtInColor === 'true') {
      const iconStack = balanceStack.addStack();
      iconStack.setPadding(4 * this.SCALE, 4 * this.SCALE, 4 * this.SCALE, 4 * this.SCALE);
      iconStack.backgroundColor = this.fee.iconColor;
      iconStack.cornerRadius = 12 * this.SCALE;
      const iconImage = iconStack.addImage(icon);
      iconImage.imageSize = new Size(16 * this.SCALE, 16 * this.SCALE);
      iconImage.tintColor = Color.white();
    } else {
      const iconImage = balanceStack.addImage(icon);
      iconImage.imageSize = new Size(24 * this.SCALE, 24 * this.SCALE);
    }

    bodyStack.addSpacer();
    const mainStack = bodyStack.addStack();
    mainStack.setPadding(8 * this.SCALE, 12 * this.SCALE, 8 * this.SCALE, 12 * this.SCALE);
    mainStack.cornerRadius = 14 * this.SCALE;
    mainStack.backgroundColor = Color.dynamic(new Color("#E2E2E7", 0.3), new Color("#2C2C2F", 1));
    mainStack.layoutVertically();

    this.setList(mainStack, this.flow);
    mainStack.addSpacer();
    this.setList(mainStack, this.voice);
  };
  
  setList(stack, data) {
    const rowStack = stack.addStack();
    rowStack.centerAlignContent();
    const lineStack = rowStack.addStack();
    lineStack.size = new Size(8 * this.SCALE, 30 * this.SCALE); 
    lineStack.cornerRadius = 4 * this.SCALE;
    lineStack.backgroundColor = data.iconColor;

    rowStack.addSpacer(10 * this.SCALE);

    const leftStack = rowStack.addStack();
    leftStack.layoutVertically();
    leftStack.addSpacer(2 * this.SCALE);

    const titleStack = leftStack.addStack();
    const title = titleStack.addText(data.title);
    title.font = Font.systemFont(10 * this.SCALE); 
    title.textColor = this.widgetColor;
    title.textOpacity = 0.5;

    const valueStack = leftStack.addStack();
    valueStack.centerAlignContent();
    const value = valueStack.addText(`${data.number}`);
    value.font = Font.semiboldRoundedSystemFont(16 * this.SCALE);
    value.textColor = this.widgetColor;
    valueStack.addSpacer();

    const unitStack = valueStack.addStack();
    unitStack.cornerRadius = 4 * this.SCALE;
    unitStack.borderWidth = 1;
    unitStack.borderColor = data.iconColor;
    unitStack.setPadding(1, 3 * this.SCALE, 1, 3 * this.SCALE);
    unitStack.size = new Size(30 * this.SCALE, 0)
    unitStack.backgroundColor = Color.dynamic(data.iconColor, new Color(data.iconColor.hex, 0.3));
    const unit = unitStack.addText(data.en);
    unit.font = Font.mediumRoundedSystemFont(10 * this.SCALE);
    unit.textColor = Color.dynamic(Color.white(), data.iconColor);
  };

  setRow(stack, data, color) {
    const stackWidth = 68 * this.SCALE;
    const rowStack = stack.addStack();
    rowStack.layoutVertically();
    rowStack.size = new Size(stackWidth, 0);
    const image = this.gaugeChart(data, color);
    const imageStack = rowStack.addStack();
    imageStack.layoutVertically();
    imageStack.size = new Size(stackWidth, stackWidth);
    imageStack.backgroundImage = image;
    imageStack.addSpacer();
    const iconStack = imageStack.addStack();
    iconStack.addSpacer();
    const sfs = SFSymbol.named(data.icon) || SFSymbol.named('phone.fill');
    sfs.applyHeavyWeight();
    const icon = iconStack.addImage(sfs.image);
    icon.imageSize = new Size(22 * this.SCALE, 22 * this.SCALE);
    icon.tintColor = new Color(color);
    iconStack.addSpacer();
    imageStack.addSpacer(8 * this.SCALE);
    const unitStack = imageStack.addStack();
    unitStack.addSpacer();
    const innerStack = unitStack.addStack();
    innerStack.size = new Size(32 * this.SCALE, 0);
    innerStack.setPadding(1, 1, 1, 1);
    innerStack.backgroundColor = new Color(color);
    innerStack.cornerRadius = 4 * this.SCALE;
    const unit = innerStack.addText(data.en);
    unit.font = Font.semiboldRoundedSystemFont(10 * this.SCALE);
    unit.textColor = Color.white();
    unitStack.addSpacer();
    imageStack.addSpacer(4 * this.SCALE);

    const infoStack = rowStack.addStack();
    infoStack.cornerRadius = 12 * this.SCALE;
    infoStack.layoutVertically();
    let gradient = new LinearGradient();
    gradient.colors = [new Color(color,0.1), new Color(color,0.01)];
    gradient.locations = [0, 1];
    gradient.startPoint = new Point(0, 0);
    gradient.endPoint = new Point(0, 1);
    infoStack.backgroundGradient = gradient;

    const valueStack = infoStack.addStack();
    valueStack.size = new Size(stackWidth, 0);
    valueStack.setPadding(3 * this.SCALE, 0, 2 * this.SCALE, 0)
    const value = valueStack.addText(`${data.number}`);
    value.textColor = this.widgetColor;
    value.font = Font.semiboldRoundedSystemFont(18 * this.SCALE);
    value.centerAlignText();

    const titleStack = infoStack.addStack();
    titleStack.addSpacer();
    const title = titleStack.addText(data.title);
    title.font = Font.regularRoundedSystemFont(9 * this.SCALE);
    title.textOpacity = 0.5;
    titleStack.addSpacer();
  };
  
  async small(stack, data, logo = false, en = false) {
    const bg = new LinearGradient();
    bg.locations = [0, 1];
    bg.endPoint = new Point(1, 0)
    bg.colors = [
    new Color(data.iconColor.hex, 0.1),
    new Color(data.iconColor.hex, 0.03)
    ];
    const rowStack = stack.addStack();
    rowStack.centerAlignContent();
    rowStack.setPadding(5, 8, 5, 8)
    rowStack.backgroundGradient = bg;
    rowStack.cornerRadius = 12;
    const leftStack = rowStack.addStack();
    leftStack.layoutVertically();
    const titleStack = leftStack.addStack();
    const title = titleStack.addText(data.title);
    const balanceStack = leftStack.addStack();
    balanceStack.centerAlignContent();
    const balanceUnit = en ? data.en : ''
    const balance = balanceStack.addText(`${data.number} ${balanceUnit}`);
    if (!en) this.addChineseUnit(balanceStack, data.unit, data.iconColor, 13 * this.SCALE);
    balance.font = Font.semiboldRoundedSystemFont(16 * this.SCALE);
    title.textOpacity = 0.5;
    title.font = Font.mediumSystemFont(11 * this.SCALE);
    [title, balance].map(t => t.textColor = data.iconColor);
    rowStack.addSpacer();
    let iconImage;
    if (logo) {
      const icon = await this.$request.get(this.smallLogo, 'IMG');
      iconImage = rowStack.addImage(icon);
    } else {
      const icon = SFSymbol.named(data.icon) || SFSymbol.named('phone.fill');
      icon.applyHeavyWeight();
      iconImage = rowStack.addImage(icon.image);
    };
    iconImage.imageSize = new Size(22 * this.SCALE, 22 * this.SCALE);
    iconImage.tintColor = data.iconColor;
  };

  async smallCell(stack, data, logo = false, en = false) {
    const bg = new LinearGradient();
    const padding = 6 * this.SCALE; 
    bg.locations = [0, 1];
    bg.endPoint = new Point(1, 0)
    bg.colors = [
    new Color(data.iconColor.hex, 0.03),
    new Color(data.iconColor.hex, 0.1)
    ];
    const rowStack = stack.addStack();
    rowStack.setPadding(4, 4, 4, 4)
    rowStack.backgroundGradient = bg;
    rowStack.cornerRadius = 12;
    const iconStack = rowStack.addStack();
    iconStack.backgroundColor = data.iconColor;
    iconStack.setPadding(padding, padding, padding, padding);
    iconStack.cornerRadius = 17 * this.SCALE;
    let iconImage;
    if (logo) {
      const icon = await this.$request.get(this.smallLogo, 'IMG');
      iconImage = iconStack.addImage(icon);
    } else {
      const icon = SFSymbol.named(data.icon) || SFSymbol.named('phone.fill');
      icon.applyHeavyWeight();
      iconImage = iconStack.addImage(icon.image);
    };
    iconImage.imageSize = new Size(22 * this.SCALE, 22 * this.SCALE);
    iconImage.tintColor = new Color('FFFFFF');
    rowStack.addSpacer(15);
    const rightStack = rowStack.addStack();
    rightStack.layoutVertically();
    const balanceStack = rightStack.addStack();
    balanceStack.centerAlignContent();
    const balanceUnit = en ? data.en : ''
    const balance = balanceStack.addText(`${data.number} ${balanceUnit}`);
    if (!en) this.addChineseUnit(balanceStack, data.unit, data.iconColor, 13 * this.SCALE);
    balance.font = Font.semiboldRoundedSystemFont(16 * this.SCALE);
    const titleStack = rightStack.addStack();
    const title = titleStack.addText(data.title);
    title.centerAlignText();
    rowStack.addSpacer();
    title.textOpacity = 0.5;
    title.font = Font.mediumSystemFont(11 * this.SCALE);
    [title, balance].map(t => t.textColor = data.iconColor);
  };
  
  async mediumCell(canvas, stack, data, color, fee = false, percent) {
    const bg = new LinearGradient();
    bg.locations = [0, 1];
    bg.colors = [
    new Color(color, 0.03),
    new Color(color, 0.1)
    ];
    const dataStack = stack.addStack();
    dataStack.backgroundGradient = bg;
    dataStack.cornerRadius = 15;
    dataStack.layoutVertically();
    dataStack.addSpacer();

    const topStack = dataStack.addStack();
    topStack.addSpacer();
    await this.imageCell(canvas, topStack, data, fee, percent);
    topStack.addSpacer();

    if (fee) {
      dataStack.addSpacer(5);
      const updateStack = dataStack.addStack();
      updateStack.addSpacer();
      updateStack.centerAlignContent();
      const updataIcon = SFSymbol.named('arrow.2.circlepath');
      updataIcon.applyHeavyWeight();
      const updateImg = updateStack.addImage(updataIcon.image);
      updateImg.tintColor = new Color(color, 0.6);
      updateImg.imageSize = new Size(10, 10);
      updateStack.addSpacer(3);
      const updateText = updateStack.addText(`${this.arrUpdateTime[2]}:${this.arrUpdateTime[3]}`)
      updateText.font = Font.mediumSystemFont(10);
      updateText.textColor = new Color(color, 0.6);
      updateStack.addSpacer();
    }
    
    dataStack.addSpacer();

    const numberStack = dataStack.addStack();
    numberStack.addSpacer();
    const number = numberStack.addText(`${data.number} ${data.en}`);
    number.font = Font.semiboldSystemFont(15);
    numberStack.addSpacer();

    dataStack.addSpacer(3);

    const titleStack = dataStack.addStack();
    titleStack.addSpacer();
    const title = titleStack.addText(data.title);
    title.font = Font.mediumSystemFont(11);
    title.textOpacity = 0.7;
    titleStack.addSpacer();

    dataStack.addSpacer(15);
    [title, number].map(t => t.textColor = new Color(color));
  }

  async imageCell(canvas, stack, data, fee, percent) {
    const canvaStack = stack.addStack();
    canvaStack.layoutVertically();
    if (!fee) {
      this.drawArc(canvas, data.percent * 3.6, data.FGColor, data.BGColor);
      canvaStack.size = new Size(this.ringStackSize, this.ringStackSize);
      canvaStack.backgroundImage = canvas.getImage();
      this.ringContent(canvaStack, data, percent);
    } else {
      canvaStack.addSpacer(10);
      const smallLogo = await this.$request.get(this.smallLogo, 'IMG');
      const logoStack = canvaStack.addStack();
      logoStack.size = new Size(40, 40);
      logoStack.backgroundImage = smallLogo;
    }
  }

  ringContent(stack, data, percent = false) {
    const rowIcon = stack.addStack();
    rowIcon.addSpacer();
    const icon = SFSymbol.named(data.icon) || SFSymbol.named('phone.fill');
    icon.applyHeavyWeight();
    const iconElement = rowIcon.addImage(icon.image);
    iconElement.tintColor = this.gradient ? new Color(data.colors[1]) : data.FGColor;
    iconElement.imageSize = new Size(12, 12);
    iconElement.imageOpacity = 0.7;
    rowIcon.addSpacer();

    stack.addSpacer(1);

    const rowNumber = stack.addStack();
    rowNumber.addSpacer();
    const number = rowNumber.addText(percent ? `${data.percent}` : `${data.number}`);
    number.font = percent ? Font.systemFont(this.ringTextSize - 2) : Font.mediumSystemFont(this.ringTextSize);
    rowNumber.addSpacer();

    const rowUnit = stack.addStack();
    rowUnit.addSpacer();
    const unit = rowUnit.addText(percent ? '%' : data.unit);
    unit.font = Font.boldSystemFont(8);
    unit.textOpacity = 0.5;
    rowUnit.addSpacer();

    if (percent) {
      if (this.gradient) {
        [unit, number].map(t => t.textColor = new Color(data.colors[1]));
      } else {
        [unit, number].map(t => t.textColor = data.FGColor);
      }
    } else {
      [unit, number].map(t => t.textColor = this.widgetColor);
    }
  }

  makeCanvas() {
    const canvas = new DrawContext();
    canvas.opaque = false;
    canvas.respectScreenScale = true;
    canvas.size = new Size(this.canvSize, this.canvSize);
    return canvas;
  }

  sinDeg(deg) { return Math.sin((deg * Math.PI) / 180); }
  cosDeg(deg) { return Math.cos((deg * Math.PI) / 180); }

  drawArc(canvas, deg, fillColor, strokeColor) {
    let ctr = new Point(this.canvSize / 2, this.canvSize / 2);
    let bgx = ctr.x - this.canvRadius;
    let bgy = ctr.y - this.canvRadius;
    let bgd = 2 * this.canvRadius;
    let bgr = new Rect(bgx, bgy, bgd, bgd)

    canvas.setStrokeColor(strokeColor);
    canvas.setLineWidth(this.canvWidth);
    canvas.strokeEllipse(bgr);

    for (let t = 0; t < deg; t++) {
      let rect_x = ctr.x + this.canvRadius * this.sinDeg(t) - this.canvWidth / 2;
      let rect_y = ctr.y - this.canvRadius * this.cosDeg(t) - this.canvWidth / 2;
      let rect_r = new Rect(rect_x, rect_y, this.canvWidth, this.canvWidth);
      canvas.setFillColor(this.gradient ? new Color(fillColor[t]) : fillColor);
      canvas.setStrokeColor(strokeColor)
      canvas.fillEllipse(rect_r);
    }
  }
  
  gaugeChart(data, color) {
    const drawing = this.makeCanvas();
    const center = new Point(this.canvSize / 2, this.canvSize / 2);
    const radius = this.canvSize / 2 - 10;
    const circleRadius = 8;
    const startBgAngle = (10 * Math.PI) / 12;
    const endBgAngle = (26 * Math.PI) / 12;
    const totalBgAngle = endBgAngle - startBgAngle;
    const gapAngle = Math.PI / 80;
    const fillColor = data.BGColor;
    const lineWidth = circleRadius * 2;
    let progress = data.percent / 100;

    this.drawLineArc(drawing, center, radius, startBgAngle, endBgAngle, 1, fillColor, lineWidth);

    this.drawHalfCircle(center.x + radius * Math.cos(startBgAngle), center.y + radius * Math.sin(startBgAngle), startBgAngle, circleRadius, drawing, fillColor, -1);
    this.drawHalfCircle(center.x + radius * Math.cos(endBgAngle), center.y + radius * Math.sin(endBgAngle), endBgAngle, circleRadius, drawing, fillColor, 1);

    let totalProgressAngle = totalBgAngle * progress;
    for (let i = 0; i < 240 * progress; i++) { 
      const t = i / 240;
      const angle = startBgAngle + totalBgAngle * t;
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);

      const circleRect = new Rect(x - circleRadius, y - circleRadius, circleRadius * 2, circleRadius * 2);
      drawing.setFillColor(this.gradient ? new Color(data.FGColor[i]) : data.FGColor);
      drawing.fillEllipse(circleRect);
    }
    return drawing.getImage();
  };

  drawHalfCircle(centerX, centerY, startAngle, circleRadius, context, fillColor, direction = 1) {
    const halfCirclePath = new Path();
    const startX = centerX + circleRadius * Math.cos(startAngle);
    const startY = centerY + circleRadius * Math.sin(startAngle);
    halfCirclePath.move(new Point(startX, startY));

    for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const angle = startAngle + direction * Math.PI * t;
        const x = centerX + circleRadius * Math.cos(angle);
        const y = centerY + circleRadius * Math.sin(angle);
        halfCirclePath.addLine(new Point(x, y));
    }
    context.setFillColor(fillColor);
    context.addPath(halfCirclePath);
    context.fillPath();
  };

  drawLineArc(context, center, radius, startAngle, endAngle, segments, fillColor, lineWidth, dir = 1) {
    const path = new Path();
    const startX = center.x + radius * Math.cos(startAngle);
    const startY = center.y + radius * Math.sin(startAngle);
    path.move(new Point(startX, startY));

    const steps = 100;
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const angle = startAngle + (endAngle - startAngle) * t;
        const x = center.x + radius * Math.cos(angle);
        const y = center.y + radius * Math.sin(angle);
        path.addLine(new Point(x, y));
    }
    context.setStrokeColor(fillColor);
    context.setLineWidth(lineWidth);
    context.addPath(path);
    context.strokePath();
  };
  
  addChineseUnit(stack, text, color, size) {
    let textElement = stack.addText(text);
    textElement.textColor = color;
    textElement.font = Font.semiboldSystemFont(size);
    return textElement;
  };

  unit(stack, text, spacer, color = this.widgetColor) {
    stack.addSpacer(1);
    const unitStack = stack.addStack();
    unitStack.layoutVertically();
    unitStack.addSpacer(spacer);
    const unitTitle = unitStack.addText(text);
    unitTitle.font = Font.semiboldRoundedSystemFont(10);
    unitTitle.textColor = color;
  };

  arrColor() {
    let colorArr = [
      ["#FFF000", "#E62490"], ["#ABDCFF", "#0396FF"], ["#FEB692", "#EA5455"], 
      ["#CE9FFC", "#7367F0"], ["#90F7EC", "#32CCBC"], ["#FFF6B7", "#F6416C"], 
      ["#E2B0FF", "#9F44D3"], ["#F97794", "#F072B6"], ["#FCCF31", "#F55555"], 
      ["#5EFCE8", "#736EFE"]
    ];
    return colorArr[Math.floor(Math.random() * colorArr.length)];
  }

  getIconColorSet() {
    const colors = [
      ["#1E81B0", "#FF5714", "#FF6347"], ["#FF6347", "#32CD32", "#3CB371"], 
      ["#FF8C00", "#4682B4", "#20B2AA"], ["#FF4500", "#00CED1", "#00BFFF"], 
      ["#DB7093", "#3CB371", "#FFA07A"]
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  gradientColor(colors, step) {
    var startRGB = this.colorToRgb(colors[0]), startR = startRGB[0], startG = startRGB[1], startB = startRGB[2];
    var endRGB = this.colorToRgb(colors[1]), endR = endRGB[0], endG = endRGB[1], endB = endRGB[2];
    var sR = (endR - startR) / step, sG = (endG - startG) / step, sB = (endB - startB) / step;
    var colorArr = [];
    for (var i = 0;i < step; i++) {
     colorArr.push(this.colorToHex('rgb(' + parseInt((sR * i + startR)) + ',' + parseInt((sG * i + startG)) + ',' + parseInt((sB * i + startB)) + ')'));
    }
    return colorArr;
  }

  colorToRgb(sColor) {
    var reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
    var sColor = sColor.toLowerCase();
    if (sColor && reg.test(sColor)) {
      if (sColor.length === 4) {
        var sColorNew = "#";
        for (var i = 1; i < 4; i += 1) sColorNew += sColor.slice(i, i + 1).concat(sColor.slice(i, i + 1));
        sColor = sColorNew;
      }
      var sColorChange = [];
      for (var i = 1; i < 7; i += 2) sColorChange.push(parseInt("0x" + sColor.slice(i, i + 2)));
      return sColorChange;
    } else return sColor;
  };

  colorToHex(rgb) {
    var _this = rgb;
    var reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
    if (/^(rgb|RGB)/.test(_this)) {
      var aColor = _this.replace(/(?:\(|\)|rgb|RGB)*/g,"").split(",");
      var strHex = "#";
      for (var i = 0; i < aColor.length; i++) {
        var hex = Number(aColor[i]).toString(16);
        hex = hex.length < 2 ? 0 + '' + hex : hex;
        if (hex === "0") hex += hex;
        strHex += hex;
      }
      if (strHex.length !== 7) strHex = _this;
      return strHex;
    } else if (reg.test(_this)) {
      var aNum = _this.replace(/#/,"").split("");
      if (aNum.length === 6) return _this;
      else if (aNum.length === 3) {
        var numHex = "#";
        for (var i = 0; i < aNum.length; i+=1) numHex += (aNum[i] + aNum[i]);
        return numHex;
      }
    } else return _this;
  }

  getWidgetScaleFactor() {
    const referenceScreenSize = { width: 430, height: 932, widgetSize: 170 };
    const screenData = [
      { width: 440, height: 956, widgetSize: 170 }, { width: 430, height: 932, widgetSize: 170 }, 
      { width: 428, height: 926, widgetSize: 170 }, { width: 414, height: 896, widgetSize: 169 },
      { width: 414, height: 736, widgetSize: 159 }, { width: 393, height: 852, widgetSize: 158 },
      { width: 390, height: 844, widgetSize: 158 }, { width: 375, height: 812, widgetSize: 155 },
      { width: 375, height: 667, widgetSize: 148 }, { width: 360, height: 780, widgetSize: 155 },
      { width: 320, height: 568, widgetSize: 141 }
    ];
    const deviceScreenWidth = Device.screenSize().width;
    const deviceScreenHeight = Device.screenSize().height;
    const matchingScreen = screenData.find(screen => 
      (screen.width === deviceScreenWidth && screen.height === deviceScreenHeight) ||
      (screen.width === deviceScreenHeight && screen.height === deviceScreenWidth)
    );
    if (!matchingScreen) return 1;
    return Math.floor((matchingScreen.widgetSize / referenceScreenSize.widgetSize) * 100) / 100;
  };

  setColorConfig = async () => { /* 颜色设置不变 */ };
  setSizeConfig = async () => { /* 尺寸设置不变 */ };

  Run() {
    if (config.runsInApp) {
      this.registerAction({
        title: 'API 配置 (仅需一次)',
        menu: [
          {
            name: 'api_url',
            icon: { name: 'link.badge.plus', color: '#6CCA16' },
            title: '配置自定义 API 链接',
            type: 'input',
            onClick: async () => {
              await this.setAlertInput(
                "请填入完整的 API 请求地址", 
                "中国电信自定义接口", 
                { custom_api_url: "custom_api_url" }
              );
              this.reopenScript();
            },
          },
          {
            url: 'https://raw.githubusercontent.com/anker1209/Scriptable/main/icon/widgetStyle.png',
            type: 'select',
            title: '组件样式',
            options: ['1', '2', '3', '4', '5', '6'],
            val: 'widgetStyle',
          },
        ],
      });
      this.registerAction({
        title: '',
        menu: [
          { name: 'basic', url: 'https://raw.githubusercontent.com/anker1209/Scriptable/main/icon/basic.png', title: '基础设置', type: 'input', onClick: () => { return this.setWidgetConfig(); } },
          { name: 'reload', url: 'https://raw.githubusercontent.com/anker1209/Scriptable/main/icon/reload.png', title: '清理缓存与重载', type: 'input', onClick: () => { this.reopenScript(); } },
        ],
      });
    }
  }

  renderSmall = async (w) => {
    w.setPadding(this.smallPadding, this.smallPadding, this.smallPadding, this.smallPadding);
    if (this.widgetStyle == "1") {
      const bodyStack = w.addStack(); bodyStack.layoutVertically();
      await this.small(bodyStack, this.fee, true); bodyStack.addSpacer();
      await this.small(bodyStack, this.flow, false, true); bodyStack.addSpacer();
      await this.small(bodyStack, this.voice);
    } else if (this.widgetStyle == "2") {
      const bodyStack = w.addStack(); bodyStack.layoutVertically();
      await this.smallCell(bodyStack, this.fee, true); bodyStack.addSpacer();
      await this.smallCell(bodyStack, this.flow, false, true); bodyStack.addSpacer();
      await this.smallCell(bodyStack, this.voice);
    } else if (this.widgetStyle == "3") {
      const bodyStack = w.addStack(); bodyStack.layoutVertically(); await this.setThirdWidget(bodyStack);
    } else if (this.widgetStyle == "4") {
      const bodyStack = w.addStack(); bodyStack.layoutVertically(); await this.setForthWidget(bodyStack);
    } else if (this.widgetStyle == "5") {
      const bodyStack = w.addStack(); bodyStack.layoutVertically(); await this.header(bodyStack);
      const canvas = this.makeCanvas(); const ringStack = bodyStack.addStack();
      this.imageCell(canvas, ringStack, this.flow); ringStack.addSpacer(); this.imageCell(canvas, ringStack, this.voice);
    } else {
      const bodyStack = w.addStack(); bodyStack.layoutVertically(); await this.header(bodyStack);
      this.textLayout(bodyStack, this.flow); bodyStack.addSpacer(7); this.textLayout(bodyStack, this.voice); bodyStack.addSpacer(7); this.textLayout(bodyStack, this.point);
    }
    return w;
  };

  renderMedium = async (w) => {
    w.setPadding(this.padding, this.padding, this.padding, this.padding);
    const canvas = this.makeCanvas();
    const bodyStack = w.addStack();
    await this.mediumCell(canvas, bodyStack, this.fee, '0A4B9D', true);
    bodyStack.addSpacer(this.padding);
    await this.mediumCell(canvas, bodyStack, this.flow, this.flowColorHex, false, true);
    bodyStack.addSpacer(this.padding);
    await this.mediumCell(canvas, bodyStack, this.voice, this.voiceColorHex, false,true);
    return w;
  };

  async render() {
    await this.init();
    const widget = new ListWidget();
    await this.getWidgetBackgroundImage(widget);
    if (this.widgetFamily === 'medium') { return await this.renderMedium(widget); } 
    else if (this.widgetFamily === 'large') { return await this.renderMedium(widget); } 
    else { return await this.renderSmall(widget); }
  }
}

await Runing(Widget, args.widgetParameter, false);
