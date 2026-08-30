using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// URP環境で特定の商品棚（Shelf）を選択・青色に発光（ハイライト）させる制御スクリプト
/// </summary>
public class ShelfHighlighter : MonoBehaviour
{
    [Header("対象の親オブジェクト")]
    [Tooltip("Store内のShelvesオブジェクトを指定します（空の場合は自動検索します）")]
    [SerializeField] private Transform shelvesParent;

    [Header("発光（ハイライト）設定")]
    [Tooltip("発光に使用するカラー（HDR対応）。青色の発光強度を調整できます。")]
    [ColorUsage(true, true)]
    [SerializeField] private Color highlightEmissionColor = new Color(0.26f, 0.89f, 1.16f, 1f);

    // 棚番号(1〜8)とGameObjectの対応辞書
    private readonly Dictionary<int, GameObject> shelfDictionary = new Dictionary<int, GameObject>();

    // 現在ハイライト中の棚
    private GameObject currentHighlightedShelf = null;

    // ハイライト中のRendererと元のマテリアル設定の保存構造
    private class RendererMaterialState
    {
        public Renderer renderer;
        public Color[] originalEmissionColors;
        public bool[] originalEmissionEnabled;
    }

    private readonly List<RendererMaterialState> activeModifiedStates = new List<RendererMaterialState>();

    private void Awake()
    {
        InitializeShelves();
    }

    private void Update()
    {
        // キーボードの 1 〜 8 キー（テンキー含む）の入力を判定
        for (int i = 1; i <= 8; i++)
        {
            KeyCode alphaKey = KeyCode.Alpha0 + i;
            KeyCode keypadKey = KeyCode.Keypad0 + i;

            if (Input.GetKeyDown(alphaKey) || Input.GetKeyDown(keypadKey))
            {
                ToggleShelfHighlight(i);
            }
        }
    }

    /// <summary>
    /// Shelf_01 〜 Shelf_08 を自動的に検索して辞書に登録
    /// </summary>
    private void InitializeShelves()
    {
        // Inspectorで指定されていない場合は Hierarchy から "Store/Shelves" を自動検索
        if (shelvesParent == null)
        {
            GameObject shelvesObj = GameObject.Find("Store/Shelves");
            if (shelvesObj != null)
            {
                shelvesParent = shelvesObj.transform;
            }
            else
            {
                Debug.LogWarning("[ShelfHighlighter] 'Store/Shelves' が見つかりませんでした。Inspectorから設定してください。");
                return;
            }
        }

        // Shelf_01 から Shelf_08 を取得して登録
        for (int i = 1; i <= 8; i++)
        {
            string shelfName = $"Shelf_{i:D2}"; // Shelf_01, Shelf_02 ...
            Transform shelfTransform = shelvesParent.Find(shelfName);

            if (shelfTransform != null)
            {
                shelfDictionary[i] = shelfTransform.gameObject;
            }
            else
            {
                Debug.LogWarning($"[ShelfHighlighter] {shelfName} が {shelvesParent.name} の直下に見つかりませんでした。");
            }
        }
    }

    /// <summary>
    /// 指定番号の棚のハイライトを切り替え
    /// </summary>
    /// <param name="shelfNumber">棚番号 (1〜8)</param>
    public void ToggleShelfHighlight(int shelfNumber)
    {
        if (!shelfDictionary.TryGetValue(shelfNumber, out GameObject targetShelf) || targetShelf == null)
        {
            Debug.LogWarning($"[ShelfHighlighter] Shelf_{shelfNumber:D2} は存在しないため選択できません。");
            return;
        }

        // すでに選択されている棚と同じキーを押した場合はトグル（解除）
        if (currentHighlightedShelf == targetShelf)
        {
            ResetCurrentHighlight();
            Debug.Log($"[ShelfHighlighter] Shelf_{shelfNumber:D2} の発光を解除しました。");
            return;
        }

        // 以前の棚の発光を解除
        ResetCurrentHighlight();

        // 新しい棚を発光
        HighlightShelf(targetShelf);
        Debug.Log($"[ShelfHighlighter] Shelf_{shelfNumber:D2} (乳製品売り場等) を青色に発光させました。");
    }

    /// <summary>
    /// 指定番号の棚を必ず発光状態にします（トグルしません）。Web連携等の外部呼び出し用。
    /// 既に同じ棚が発光中の場合は解除せずそのまま維持します。
    /// </summary>
    /// <param name="shelfNumber">棚番号 (1〜8)</param>
    public void HighlightShelf(int shelfNumber)
    {
        if (!shelfDictionary.TryGetValue(shelfNumber, out GameObject targetShelf) || targetShelf == null)
        {
            Debug.LogWarning($"[ShelfHighlighter] Shelf_{shelfNumber:D2} は存在しないため選択できません。");
            return;
        }

        // 既に同じ棚が発光中なら何もしない（トグル解除しない）
        if (currentHighlightedShelf == targetShelf)
        {
            return;
        }

        // 以前の棚の発光を解除してから新しい棚を発光
        ResetCurrentHighlight();
        HighlightShelf(targetShelf);
        Debug.Log($"[ShelfHighlighter] Shelf_{shelfNumber:D2} (乳製品売り場等) を青色に発光させました。");
    }

    /// <summary>
    /// 対象棚とその子要素すべてのRendererを発光させる
    /// </summary>
    private void HighlightShelf(GameObject shelfObj)
    {
        currentHighlightedShelf = shelfObj;
        activeModifiedStates.Clear();

        // 親・子オブジェクト内のすべてのRenderer（MeshRendererなど）を取得
        Renderer[] renderers = shelfObj.GetComponentsInChildren<Renderer>();

        foreach (Renderer rend in renderers)
        {
            // renderer.materials を呼ぶことで、プロジェクト内の元アセットを変更せず、
            // 実行時専用のマテリアルインスタンス（複製）が自動作成されます。
            Material[] mats = rend.materials;

            RendererMaterialState state = new RendererMaterialState
            {
                renderer = rend,
                originalEmissionColors = new Color[mats.Length],
                originalEmissionEnabled = new bool[mats.Length]
            };

            for (int i = 0; i < mats.Length; i++)
            {
                Material mat = mats[i];
                if (mat == null) continue;

                // 元のマテリアルのEmission設定状態と色を保持
                state.originalEmissionEnabled[i] = mat.IsKeywordEnabled("_EMISSION");
                if (mat.HasProperty("_EmissionColor"))
                {
                    state.originalEmissionColors[i] = mat.GetColor("_EmissionColor");
                }

                // URP Lit 用の発光（Emission）を設定
                mat.EnableKeyword("_EMISSION");
                if (mat.HasProperty("_EmissionColor"))
                {
                    mat.SetColor("_EmissionColor", highlightEmissionColor);
                }
            }

            activeModifiedStates.Add(state);
        }
    }

    /// <summary>
    /// 現在発光中の棚を元のマテリアル状態に戻す
    /// </summary>
    private void ResetCurrentHighlight()
    {
        if (currentHighlightedShelf == null) return;

        foreach (RendererMaterialState state in activeModifiedStates)
        {
            if (state.renderer == null) continue;

            Material[] mats = state.renderer.materials;
            for (int i = 0; i < mats.Length; i++)
            {
                if (i >= state.originalEmissionColors.Length) break;
                Material mat = mats[i];
                if (mat == null) continue;

                // 元の発光色に戻す
                if (mat.HasProperty("_EmissionColor"))
                {
                    mat.SetColor("_EmissionColor", state.originalEmissionColors[i]);
                }

                // 元々Emissionがオフだった場合は無効化に戻す
                if (!state.originalEmissionEnabled[i])
                {
                    mat.DisableKeyword("_EMISSION");
                }
            }
        }

        currentHighlightedShelf = null;
        activeModifiedStates.Clear();
    }

    private void OnDestroy()
    {
        // シーン終了時に作成されたインスタンスマテリアルのメモリをリセット
        ResetCurrentHighlight();
    }
}