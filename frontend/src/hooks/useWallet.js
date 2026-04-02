import { useEffect, useState, useCallback } from 'react'
import { ethers } from 'ethers'

const MUMBAI_CHAIN_ID = '0x13881'
const HARDHAT_CHAIN_ID = '0x7a69'

const USE_HARDHAT = typeof import.meta !== 'undefined' && import.meta.env
  ? import.meta.env.VITE_USE_HARDHAT === 'true'
  : process.env.NEXT_PUBLIC_USE_HARDHAT === 'true'

const TARGET_CHAIN_ID = USE_HARDHAT ? HARDHAT_CHAIN_ID : MUMBAI_CHAIN_ID
const normalizeAddress = (address) => address?.toLowerCase?.() || null

export function useWallet() {
  const [account, setAccount] = useState(null)
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false)
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)

  const updateNetworkState = useCallback(async (web3Provider) => {
    try {
      const network = await web3Provider.getNetwork()
      const currentChainId = `0x${network.chainId.toString(16)}`
      setChainId(currentChainId)
      setIsCorrectNetwork(currentChainId === TARGET_CHAIN_ID)
    } catch (err) {
      console.warn('Unable to read network:', err)
      setChainId(null)
      setIsCorrectNetwork(false)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.ethereum === 'undefined') {
      setIsMetaMaskInstalled(false)
      return
    }

    setIsMetaMaskInstalled(true)
    const ethereum = window.ethereum
    const web3Provider = new ethers.BrowserProvider(ethereum)
    setProvider(web3Provider)

    const handleAccountsChanged = async (accounts) => {
      if (!accounts || accounts.length === 0) {
        setAccount(null)
        setSigner(null)
        setIsConnected(false)
        return
      }

      const normalized = normalizeAddress(accounts[0])
      setAccount(normalized)
      setIsConnected(true)

      try {
        const nextSigner = await web3Provider.getSigner()
        setSigner(nextSigner)
      } catch (err) {
        console.warn('Unable to get signer after account change:', err)
        setSigner(null)
      }
    }

    const handleChainChanged = (chain) => {
      const normalizedChain = typeof chain === 'number' ? `0x${chain.toString(16)}` : chain
      setChainId(normalizedChain)
      setIsCorrectNetwork(normalizedChain === TARGET_CHAIN_ID)
    }

    const initialize = async () => {
      await updateNetworkState(web3Provider)

      try {
        const accounts = await ethereum.request({ method: 'eth_accounts' })
        if (accounts && accounts.length > 0) {
          await handleAccountsChanged(accounts)
        }
      } catch (err) {
        console.warn('Failed to read existing accounts:', err)
      }
    }

    initialize()
    ethereum.on('accountsChanged', handleAccountsChanged)
    ethereum.on('chainChanged', handleChainChanged)

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged)
      ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }, [updateNetworkState])

  const connectWallet = useCallback(async () => {
    if (typeof window === 'undefined' || typeof window.ethereum === 'undefined') {
      setError('MetaMask not installed')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      const ethereum = window.ethereum
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
      const web3Provider = new ethers.BrowserProvider(ethereum)
      const web3Signer = await web3Provider.getSigner()

      setProvider(web3Provider)
      setSigner(web3Signer)
      setAccount(normalizeAddress(accounts[0] || null))
      setIsConnected(accounts && accounts.length > 0)
      await updateNetworkState(web3Provider)
    } catch (err) {
      setError(err?.message || 'Wallet connection failed')
    } finally {
      setIsConnecting(false)
    }
  }, [updateNetworkState])

  const switchNetwork = useCallback(async () => {
    if (typeof window === 'undefined' || typeof window.ethereum === 'undefined') {
      setError('MetaMask not installed')
      return
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: TARGET_CHAIN_ID }],
      })
    } catch (switchError) {
      if (switchError?.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: TARGET_CHAIN_ID,
                chainName: TARGET_CHAIN_ID === HARDHAT_CHAIN_ID ? 'Hardhat Local' : 'Polygon Mumbai',
                nativeCurrency: {
                  name: TARGET_CHAIN_ID === HARDHAT_CHAIN_ID ? 'ETH' : 'MATIC',
                  symbol: TARGET_CHAIN_ID === HARDHAT_CHAIN_ID ? 'ETH' : 'MATIC',
                  decimals: 18,
                },
                rpcUrls: [TARGET_CHAIN_ID === HARDHAT_CHAIN_ID ? 'http://127.0.0.1:8545' : 'https://rpc-mumbai.maticvigil.com/'],
                blockExplorerUrls: TARGET_CHAIN_ID === HARDHAT_CHAIN_ID ? ['https://explorer.localhost'] : ['https://mumbai.polygonscan.com'],
              },
            ],
          })
        } catch (addError) {
          setError(addError?.message || 'Unable to add network to MetaMask')
        }
      } else {
        setError(switchError?.message || 'Unable to switch network')
      }
    }
  }, [])

  const disconnectWallet = useCallback(() => {
    setAccount(null)
    setProvider(null)
    setSigner(null)
    setChainId(null)
    setIsCorrectNetwork(false)
    setIsConnected(false)
    setError(null)
  }, [])

  const truncateAddress = useCallback((address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }, [])

  return {
    account,
    provider,
    signer,
    chainId,
    isMetaMaskInstalled,
    isCorrectNetwork,
    isConnected,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    truncateAddress,
  }
}
