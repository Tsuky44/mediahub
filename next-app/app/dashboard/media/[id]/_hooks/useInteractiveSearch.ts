'use client'

import { useCallback, useEffect, useState } from 'react'
import { searchReleases, downloadRelease, getSeriesEpisodes } from '../interactive-actions'

interface Episode {
    id: number
    seasonNumber: number
    episodeNumber: number
    title: string
}

interface Release {
    guid: string
    indexer: string
    indexerId: number
    publishDate: string
    title: string
    size: number
    seeders: number
    leechers: number
    languages?: { name: string }[]
    quality: { quality: { name: string } }
}

export interface UseInteractiveSearchResult {
    episodes: Episode[]
    seasons: number[]
    searchMode: 'episode' | 'season'
    setSearchMode: (mode: 'episode' | 'season') => void
    selectedEpisode: number | null
    setSelectedEpisode: (id: number | null) => void
    selectedSeason: number | null
    setSelectedSeason: (s: number | null) => void
    releases: Release[]
    loading: boolean
    loadingEpisodes: boolean
    downloading: string | null
    error: string | null
    handleSearch: () => Promise<void>
    handleDownload: (guid: string, indexerId: number) => Promise<void>
    canSearch: () => boolean
}

export function useInteractiveSearch(
    tmdbId: number,
    mediaType: 'movie' | 'tv',
): UseInteractiveSearchResult {
    const [episodes, setEpisodes] = useState<Episode[]>([])
    const [seasons, setSeasons] = useState<number[]>([])
    const [searchMode, setSearchMode] = useState<'episode' | 'season'>('episode')
    const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null)
    const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
    const [releases, setReleases] = useState<Release[]>([])
    const [loading, setLoading] = useState(false)
    const [downloading, setDownloading] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loadingEpisodes, setLoadingEpisodes] = useState(false)

    // Load episodes for TV shows
    useEffect(() => {
        if (mediaType === 'tv') {
            setLoadingEpisodes(true)
            getSeriesEpisodes(tmdbId).then(res => {
                if (res.error) {
                    setError(res.error)
                } else if (res.episodes) {
                    const eps = res.episodes.sort((a: any, b: any) =>
                        (b.seasonNumber - a.seasonNumber) || (b.episodeNumber - a.episodeNumber)
                    )
                    setEpisodes(eps)
                    const uniqueSeasons = Array.from(new Set(eps.map((e: any) => e.seasonNumber))).sort((a: any, b: any) => b - a)
                    setSeasons(uniqueSeasons as number[])
                }
                setLoadingEpisodes(false)
            })
        }
    }, [tmdbId, mediaType])

    // Reset selection when switching modes
    useEffect(() => {
        setSelectedEpisode(null)
        setSelectedSeason(null)
        setReleases([])
        setError(null)
    }, [searchMode])

    const handleSearch = useCallback(async () => {
        setLoading(true)
        setError(null)
        setReleases([])

        let res
        if (mediaType === 'tv' && searchMode === 'season') {
            if (selectedSeason === null) {
                setError('Veuillez sélectionner une saison')
                setLoading(false)
                return
            }
            res = await searchReleases(tmdbId, mediaType, undefined, selectedSeason)
        } else {
            res = await searchReleases(tmdbId, mediaType, selectedEpisode || undefined)
        }

        if (res.error) {
            setError(res.error)
        } else if (res.releases) {
            setReleases(res.releases.sort((a: any, b: any) => b.seeders - a.seeders))
        }

        setLoading(false)
    }, [mediaType, searchMode, selectedSeason, selectedEpisode, tmdbId])

    const handleDownload = useCallback(async (guid: string, indexerId: number) => {
        setDownloading(guid)
        const res = await downloadRelease(mediaType, guid, indexerId)

        if (res.error) {
            setError(res.error)
        } else {
            alert('Téléchargement lancé avec succès')
        }
        setDownloading(null)
    }, [mediaType])

    const canSearch = useCallback(() => {
        if (loading) return false
        if (mediaType === 'movie') return true
        if (searchMode === 'season') return selectedSeason !== null
        return selectedEpisode !== null
    }, [loading, mediaType, searchMode, selectedSeason, selectedEpisode])

    return {
        episodes,
        seasons,
        searchMode,
        setSearchMode,
        selectedEpisode,
        setSelectedEpisode,
        selectedSeason,
        setSelectedSeason,
        releases,
        loading,
        loadingEpisodes,
        downloading,
        error,
        handleSearch,
        handleDownload,
        canSearch,
    }
}
