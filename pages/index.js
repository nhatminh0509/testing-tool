import React, { useState, useEffect } from "react";
import { Button, Col, Input, Radio, Row } from "antd";
import Web3 from "web3";
import "./style.scss";
import 'react-toastify/dist/ReactToastify.css';
import { toast, ToastContainer } from "react-toastify";
export default function Home() {
  const [tab, setTab] = useState('n-1')
  const [accountText, setAccountText] = useState('');
  const [step, setStep] = useState(1);
  const [accountList, setAccountList] = useState([]);
  const [addressContract, setAddressContract] = useState("");
  const [abiContractText, setAbiContractText] = useState("");
  const [valueCoin, setValueCoin] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");
  const [rpc, setRpc] = useState("");
  const [scan, setScan] = useState("");
  const [abi, setAbi] = useState({});
  const [functions, setFunctions] = useState([]);
  const [selectedFunctionName, setSelectedFunctionName] = useState("");
  const [selectedFunction, setSelectedFunction] = useState({});
  const [transactionHashs, setTransactionHashs] = useState([]);
  const [inputs, setInputs] = useState([]);
  const [accountAddress, setAccountAddress] = useState('')
  const [privateKeyAccount, setPrivateKeyAccount] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    const func = functions.find((item) => item.name === selectedFunctionName);
    setSelectedFunction(func);
    setInputs(func?.inputs?.map((item) => ""));
  }, [selectedFunctionName, functions]);

  const readAccountFromFile = (e) => {
    const fileReader = new FileReader()
    fileReader.onloadend = () => {
      setAccountText(fileReader.result)
    }
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0])
    }
  }
  
  const readJsonFromFile = (e, index) => {
    const fileReader = new FileReader()
    fileReader.onloadend = () => {
      setInputs(state => {
        const newValue = [...state]
        newValue[index] = fileReader.result
        return newValue
      })
    }
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0])
    }
  }

  const createAccount = async (accountText) => {
    let accounts = []
    const web3 = new Web3();
    for (let i = 0; i < accountText; i++) {
      const account = web3.eth.accounts.create();
      accounts.push({
        address: account.address,
        privateKey: account.privateKey,
      })
    }
    if (accounts && accounts.length > 0) {
      const fileName = "accounts";
      const json = JSON.stringify(accounts);
      const blob = new Blob([json], { type: "application/json" });
      const href = await URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = fileName + ".json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    if (accounts && accounts.length > 0) {
      const fileName = "accountsWithoutPrivate";
      const json = JSON.stringify(accounts.map(item => item.address));
      const blob = new Blob([json], { type: "application/json" });
      const href = await URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = fileName + ".json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  const roundingNumber = (number, rounding = 7) => {
    const powNumber = Math.pow(10, parseInt(rounding))
    return Math.floor(number * powNumber) / powNumber
  }

  const loadAccount = async (accountText) => {
    let accounts = [];
    if (accountText?.toString()?.includes("[")) {
      accounts = JSON.parse(accountText);
    }
    setAccountList(accounts);
    return accounts
  };

  const detectAbi = () => {
    setAbi(JSON.parse(abiContractText));
    setFunctions(
      Object.values(JSON.parse(abiContractText)).filter(
        (item) => item.type === "function"
      )
    );
  };

  const onSubmitStep1 = async () => {
    loadAccount(accountText);
    detectAbi();
    onNext();
  };

  const onPrev = () => {
    setStep((state) => state - 1);
  };

  const onNext = () => {
    setStep((state) => state + 1);
  };

  const titleInStep = () => {
    switch (step) {
      case 1:
        return <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          Testing:
          <Radio checked={tab === 'n-1'} onChange={(e) => e.target.checked && setTab('n-1')} style={{ color: 'white' }}>Multi call</Radio>
          <Radio checked={tab === '1-n'} onChange={(e) => e.target.checked && setTab('1-n')} style={{ color: 'white' }}>Single call</Radio>
          <Radio checked={tab === 'createAccount'} onChange={(e) => e.target.checked && setTab('createAccount')} style={{ color: 'white' }}>Create Account</Radio>
        </div>
      case 2:
        return "Chọn function";
      case 3:
        return selectedFunctionName;
      default:
        return "Testing";
    }
  };

  const sendTransaction = async (
    contractAddress,
    accountAddress,
    privateKey,
    dataTx,
    value
  ) => {
    try {
      const web3 = new Web3(new Web3.providers.HttpProvider(rpc));
      const nonce = await web3.eth.getTransactionCount(accountAddress);
      const gasPrice = await web3.eth.getGasPrice();

      const rawTransaction = {
        nonce: web3.utils.toHex(nonce),
        from: accountAddress,
        to: contractAddress,
        gasPrice: web3.utils.toHex(gasPrice),
      };

      if (dataTx) {
        rawTransaction.data = dataTx
      }

      if (value) {
        rawTransaction.value = web3.utils.toHex(
          web3.utils.toWei(value?.toString(), "ether")
        );
      }

      const gasLimit = await web3.eth.estimateGas(rawTransaction);
      const gasLimitHex = web3.utils.toHex(roundingNumber(gasLimit * 1.1, 0));
      rawTransaction.gasLimit = gasLimitHex;

      const signedTransaction = await web3.eth.accounts.signTransaction(
        rawTransaction,
        privateKey
      )

      return web3.eth
        .sendSignedTransaction(signedTransaction.rawTransaction)
        .on("receipt", ({ transactionHash }) => {
          console.log('hash', transactionHash)
          toast(transactionHash)
          setTransactionHashs((state) => [transactionHash, ...state]);
        })
        .catch((err) => {
          console.error(err);
        });
    } catch (error) {
      console.error(error);
    }
  };

  const onSubmit = async () => {
    try {
      setLoading(true)
      const web3 = new Web3(new Web3.providers.HttpProvider(rpc));
      const contract = new web3.eth.Contract(abi, addressContract);
      const arrPromise = Promise.all(
        accountList.map(async (item, index) => {
          setTimeout(async() => {
            const dataTx = contract.methods[selectedFunctionName](
              ...inputs
            ).encodeABI();
            await sendTransaction(
              addressContract,
              item.address,
              item.privateKey,
              dataTx,
              !valueCoin || valueCoin === "" ? 0 : Number(valueCoin)
            )
            if (index === accountList.length - 1) {
              toast('Successfully')
              setLoading(false)
            }
          }, index * 1000)
        })
      );
      await arrPromise;
    } catch (error) {
      toast('Error')
      console.log(error);
    }
  }
  
  const onSubmitSingle = async () => {
    try {
      setLoading(true)
      const web3 = new Web3(new Web3.providers.HttpProvider(rpc));
      const contract = new web3.eth.Contract(abi, addressContract);
      const dataTx = contract.methods[selectedFunctionName](
        ...inputs.map(item => item.includes('[') ? JSON.parse(item) : item)
      ).encodeABI();
      await sendTransaction(
        addressContract,
        accountAddress,
        privateKeyAccount,
        dataTx,
        !valueCoin || valueCoin === "" ? 0 : Number(valueCoin)
      )
      setLoading(false)
      toast('Successfully')
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <div className="container">
      <div className="wrapper">
        <div className="header">
          <div className="left">
            <div className="title">{titleInStep()}</div>
          </div>
          <div className="right">
            <div className="title" style={{ cursor: 'pointer', color: 'rgb(80, 144, 234)' }} onClick={() => window.location.reload()} >Reset</div>
          </div>
        </div>
        {tab === "createAccount" && (
          <div className="body">
            <div className="input-wrapper">
              <label className="label">Số lượng accounts</label>
              <Input
                value={accountText}
                type='number'
                onChange={(e) => setAccountText(e.target.value)}
              />
            </div>
            <Button loading={loading}  className="button" onClick={() => createAccount(Number(accountText))}>
              Create 
            </Button>
          </div>
        )}
        {tab === "n-1" && (
          <>
            {step === 1 && (
              <div className="body">
                <div className="input-wrapper">
                  <div className="label">Accounts <input type='file' onChange={readAccountFromFile}/></div>
                  <Input
                    value={accountText}
                    onChange={(e) => setAccountText(e.target.value)}
                  />
                </div>
                <div className="input-wrapper">
                  <label className="label">RPC</label>
                  <Input value={rpc} onChange={(e) => setRpc(e.target.value)} />
                </div>
                {/* <div className="input-wrapper">
                  <label className="label">Scan URL</label>
                  <Input
                    value={scan}
                    onChange={(e) => setScan(e.target.value)}
                  />
                </div> */}
                <div className="input-wrapper">
                  <label className="label">Address Contract</label>
                  <Input
                    value={addressContract}
                    onChange={(e) => setAddressContract(e.target.value)}
                  />
                </div>
                <div className="input-wrapper">
                  <label className="label">ABI Contract</label>
                  <Input
                    value={abiContractText}
                    onChange={(e) => setAbiContractText(e.target.value)}
                  />
                </div>
                <Button loading={loading} className="button" onClick={onSubmitStep1}>
                  Next
                </Button>
              </div>
            )}
            {step === 2 && (
              <div className="body">
                <Row>
                  {functions
                    .filter((item) => item.stateMutability !== "view")
                    .map((item) => (
                      <Col span={12} key={item.name}>
                        <Radio
                          checked={selectedFunctionName === item.name}
                          onChange={(e) =>
                            e.target.checked &&
                            setSelectedFunctionName(item.name)
                          }
                          className="radio-button"
                        >
                          {item.name}
                        </Radio>
                      </Col>
                    ))}
                </Row>
                <div className="button-container">
                  <Button loading={loading} className="button" onClick={onPrev}>
                    Prev
                  </Button>
                  <Button loading={loading} className="button" onClick={onNext}>
                    Next
                  </Button>
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="body">
                {selectedFunction?.inputs?.map((item, index) => (
                  <div key={item.name} className="input-wrapper">
                    <label className="label">{item.name}</label>
                    <Input
                      value={inputs[index]}
                      onChange={(e) =>
                        setInputs((state) => {
                          const newInput = [...state];
                          newInput[index] = e.target.value;
                          return newInput;
                        })
                      }
                    />
                  </div>
                ))}
                <div className="input-wrapper">
                  <label className="label">Coin Value</label>
                  <Input
                    value={valueCoin}
                    onChange={(e) => setValueCoin(e.target.value)}
                  />
                </div>
                <div className="button-container">
                  <Button loading={loading} className="button" onClick={onPrev}>
                    Prev
                  </Button>
                  <Button loading={loading} className="button" onClick={onSubmit}>
                    Submit
                  </Button>
                </div>
              </div>
            )}
            {step === 4 && (
              <div className="body">
                <Button loading={loading}
                  className="button"
                  onClick={() => window.location.reload()}
                >
                  Reset
                </Button>
              </div>
            )}
          </>
        )}
        {tab === "1-n" && (
          <>
            {step === 1 && (
              <div className="body">
                {/* <div className="input-wrapper">
                  <div className="label">Accounts <input type='file' onChange={readAccountFromFile}/></div>
                  <Input
                    value={accountText}
                    onChange={(e) => setAccountText(e.target.value)}
                  />
                </div> */}
                <div className="input-wrapper">
                  <label className="label">Account address</label>
                  <Input value={accountAddress} onChange={(e) => setAccountAddress(e.target.value)} />
                </div>
                <div className="input-wrapper">
                  <label className="label">Private key</label>
                  <Input value={privateKeyAccount} onChange={(e) => setPrivateKeyAccount(e.target.value)} />
                </div>
                <div className="input-wrapper">
                  <label className="label">RPC</label>
                  <Input value={rpc} onChange={(e) => setRpc(e.target.value)} />
                </div>
                {/* <div className="input-wrapper">
                  <label className="label">Scan URL</label>
                  <Input
                    value={scan}
                    onChange={(e) => setScan(e.target.value)}
                  />
                </div> */}
                <div className="input-wrapper">
                  <label className="label">Address Contract</label>
                  <Input
                    value={addressContract}
                    onChange={(e) => setAddressContract(e.target.value)}
                  />
                </div>
                <div className="input-wrapper">
                  <label className="label">ABI Contract</label>
                  <Input
                    value={abiContractText}
                    onChange={(e) => setAbiContractText(e.target.value)}
                  />
                </div>
                <Button loading={loading} className="button" onClick={onSubmitStep1}>
                  Next
                </Button>
              </div>
            )}
            {step === 2 && (
              <div className="body">
                <Row>
                  {functions
                    .filter((item) => item.stateMutability !== "view")
                    .map((item) => (
                      <Col span={12} key={item.name}>
                        <Radio
                          checked={selectedFunctionName === item.name}
                          onChange={(e) =>
                            e.target.checked &&
                            setSelectedFunctionName(item.name)
                          }
                          className="radio-button"
                        >
                          {item.name}
                        </Radio>
                      </Col>
                    ))}
                </Row>
                <div className="button-container">
                  <Button loading={loading} className="button" onClick={onPrev}>
                    Prev
                  </Button>
                  <Button loading={loading} className="button" onClick={onNext}>
                    Next
                  </Button>
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="body">
                {selectedFunction?.inputs?.map((item, index) => (
                  <div key={item.name} className="input-wrapper">
                    <label className="label">{item.name} <input type='file' onChange={(e) => readJsonFromFile(e, index)} /></label>
                    <Input
                      value={inputs[index]}
                      onChange={(e) =>
                        setInputs((state) => {
                          const newInput = [...state];
                          newInput[index] = e.target.value;
                          return newInput;
                        })
                      }
                    />
                  </div>
                ))}
                <div className="input-wrapper">
                  <label className="label">Coin Value</label>
                  <Input
                    value={valueCoin}
                    onChange={(e) => setValueCoin(e.target.value)}
                  />
                </div>
                <div className="button-container">
                  <Button loading={loading} className="button" onClick={onPrev}>
                    Prev
                  </Button>
                  <Button loading={loading} className="button" onClick={onSubmitSingle}>
                    Submit
                  </Button>
                </div>
              </div>
            )}
            {step === 4 && (
              <div className="body">
                <Button loading={loading}
                  className="button"
                  onClick={() => window.location.reload()}
                >
                  Reset
                </Button>
              </div>
            )}
          </>
        )}
       </div>
      <ToastContainer />
    </div>
  );
}
