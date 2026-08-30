using System.Collections.Generic;
using UnityEngine;
using TMPro;

/// <summary>
/// WebGL側の unityInstance.SendMessage("StoreNaviController", "StartGuideByShelfId", shelfId)
/// から棚IDを受け取り、対象棚の発光とルート案内を開始する。
/// GameObject名は "StoreNaviController" 固定（SendMessageの宛先名のため変更しないこと）。
/// </summary>
public class StoreNaviController : MonoBehaviour
{
    [Tooltip("Store配下のShelfHighlighter（未設定ならAwakeで自動検出）")]
    [SerializeField] private ShelfHighlighter shelfHighlighter;

    [Tooltip("Store/Environment/RouteGuideのStoreRouteGuide（未設定ならAwakeで自動検出）")]
    [SerializeField] private StoreRouteGuide storeRouteGuide;

    [Tooltip("DestinationPoint_Shelf_01〜08の親Transform = Store/Navigation（未設定ならAwakeで自動検出）")]
    [SerializeField] private Transform destinationPointsParent;

    [Tooltip("Shelf_01〜08の親Transform = Store/Shelves（未設定ならAwakeで自動検出。目的地マーカー表示にのみ使用）")]
    [SerializeField] private Transform shelvesParent;

    [Tooltip("案内中の対象棚を示す目的地マーカー（未設定の場合はマーカー表示のみ省略される）")]
    [SerializeField] private DestinationMarker destinationMarker;

    private readonly Dictionary<int, Transform> destinationPoints = new Dictionary<int, Transform>();
    private readonly Dictionary<int, Transform> shelfTransforms = new Dictionary<int, Transform>();
    private readonly Dictionary<int, string> shelfCategoryNames = new Dictionary<int, string>();
    private bool isReady;

    private void Awake()
    {
        ResolveReferences();
        CacheDestinationPoints();
        CacheShelfInfo();
    }

    /// <summary>
    /// Inspector未設定の参照だけを既存Hierarchyから自動検出する。
    /// シーン構造: Store配下にShelfHighlighterが1つ、Store/Environment/RouteGuideにStoreRouteGuideが1つ、
    /// Store/NavigationにDestinationPoint_Shelf_01〜08が配置されている前提。
    /// </summary>
    private void ResolveReferences()
    {
        if (shelfHighlighter == null)
        {
            ShelfHighlighter[] found = Object.FindObjectsByType<ShelfHighlighter>(FindObjectsInactive.Exclude);
            if (found.Length == 1)
            {
                shelfHighlighter = found[0];
            }
            else if (found.Length > 1)
            {
                Debug.LogError("[StoreNaviController] ShelfHighlighter が複数見つかったため自動検出できません。Inspectorで設定してください。");
            }
        }

        if (storeRouteGuide == null)
        {
            StoreRouteGuide[] found = Object.FindObjectsByType<StoreRouteGuide>(FindObjectsInactive.Exclude);
            if (found.Length == 1)
            {
                storeRouteGuide = found[0];
            }
            else if (found.Length > 1)
            {
                Debug.LogError("[StoreNaviController] StoreRouteGuide が複数見つかったため自動検出できません。Inspectorで設定してください。");
            }
        }

        if (destinationPointsParent == null)
        {
            GameObject navObj = GameObject.Find("Store/Navigation");
            if (navObj != null)
            {
                destinationPointsParent = navObj.transform;
            }
        }

        if (shelvesParent == null)
        {
            GameObject shelvesObj = GameObject.Find("Store/Shelves");
            if (shelvesObj != null)
            {
                shelvesParent = shelvesObj.transform;
            }
        }

        if (destinationMarker == null)
        {
            // 目的地マーカーは補助表示のため、未設定でも案内自体は継続する
            Debug.LogWarning("[StoreNaviController] DestinationMarker が設定されていないため、目的地マーカー表示は省略されます。");
        }

        if (shelfHighlighter == null)
        {
            Debug.LogError("[StoreNaviController] ShelfHighlighter が見つかりません。Inspectorで設定してください。");
        }

        if (storeRouteGuide == null)
        {
            Debug.LogError("[StoreNaviController] StoreRouteGuide が見つかりません。Inspectorで設定してください。");
        }

        if (destinationPointsParent == null)
        {
            Debug.LogError("[StoreNaviController] DestinationPointの親Transform が見つかりません。Inspectorで設定してください。");
        }
    }

    /// <summary>
    /// DestinationPoint_Shelf_01〜08 を棚番号ごとに一度だけキャッシュする。
    /// StartGuideByShelfId のたびにHierarchyを検索しないための事前準備。
    /// </summary>
    private void CacheDestinationPoints()
    {
        destinationPoints.Clear();

        if (destinationPointsParent != null)
        {
            for (int i = 1; i <= 8; i++)
            {
                string pointName = $"DestinationPoint_Shelf_{i:D2}";
                Transform point = destinationPointsParent.Find(pointName);
                if (point != null)
                {
                    destinationPoints[i] = point;
                }
                else
                {
                    Debug.LogWarning($"[StoreNaviController] {pointName} が見つかりませんでした。");
                }
            }
        }

        isReady = shelfHighlighter != null && storeRouteGuide != null && destinationPoints.Count > 0;
    }

    /// <summary>
    /// 目的地マーカー表示用に、Shelf_01〜08のTransformとカテゴリー名を一度だけキャッシュする。
    /// カテゴリー名は各棚のSign（TextMeshPro）の1行目から取得する。取得できなくても案内自体は継続する。
    /// </summary>
    private void CacheShelfInfo()
    {
        shelfTransforms.Clear();
        shelfCategoryNames.Clear();

        if (shelvesParent == null)
        {
            return;
        }

        for (int i = 1; i <= 8; i++)
        {
            Transform shelf = shelvesParent.Find($"Shelf_{i:D2}");
            if (shelf == null)
            {
                continue;
            }

            shelfTransforms[i] = shelf;

            TextMeshPro sign = shelf.GetComponentInChildren<TextMeshPro>();
            if (sign != null && !string.IsNullOrEmpty(sign.text))
            {
                int newlineIndex = sign.text.IndexOf('\n');
                shelfCategoryNames[i] = newlineIndex > 0 ? sign.text.Substring(0, newlineIndex) : sign.text;
            }
        }
    }

    /// <summary>
    /// WebGLのSendMessageから呼び出される単一string引数のエントリポイント。
    /// 受け付ける入力例: "Shelf_08" "shelf_08" "08" "8" "  Shelf_08  "
    /// 無効な入力では警告ログのみを出し、例外を投げず処理を停止する。
    /// </summary>
    /// <param name="shelfId">棚ID文字列</param>
    public void StartGuideByShelfId(string shelfId)
    {
        if (!isReady)
        {
            Debug.LogWarning("[StoreNaviController] 参照が未解決のため案内を開始できません。");
            return;
        }

        if (!TryParseShelfNumber(shelfId, out int shelfNumber))
        {
            Debug.LogWarning($"[StoreNaviController] 無効な棚ID '{shelfId}' を受信したため案内を開始しません。");
            return;
        }

        if (!destinationPoints.TryGetValue(shelfNumber, out Transform destination) || destination == null)
        {
            Debug.LogWarning($"[StoreNaviController] Shelf_{shelfNumber:D2} のDestinationPointが見つからないため案内を開始しません。");
            return;
        }

        shelfHighlighter.HighlightShelf(shelfNumber);
        storeRouteGuide.SetDestination(destination);
        storeRouteGuide.ShowRoute();
        UpdateDestinationMarker(shelfNumber);

        Debug.Log($"[StoreNaviController] 棚ID '{shelfId}' を Shelf_{shelfNumber:D2} として案内を開始しました。");
    }

    /// <summary>
    /// 目的地マーカーを対象棚の上へ表示する。マーカー未設定・対象棚不明の場合は
    /// 警告のみで何もせず、案内自体（発光・ルート）には影響させない。
    /// </summary>
    private void UpdateDestinationMarker(int shelfNumber)
    {
        if (destinationMarker == null)
        {
            return;
        }

        if (!shelfTransforms.TryGetValue(shelfNumber, out Transform shelfTransform) || shelfTransform == null)
        {
            Debug.LogWarning($"[StoreNaviController] Shelf_{shelfNumber:D2} のTransformが見つからないため目的地マーカーを更新しません。");
            return;
        }

        shelfCategoryNames.TryGetValue(shelfNumber, out string categoryName);
        destinationMarker.ShowForShelf(shelfTransform, shelfNumber, categoryName);
    }

    /// <summary>
    /// "Shelf_08" "shelf_08" "08" "8" 等の入力を1〜8の棚番号へ変換する。
    /// 前後の空白は許容し、"Shelf_"/"shelf_" プレフィックスの有無どちらも受け付ける。
    /// 残りの部分が1〜2桁の数字として1〜8の範囲に収まる場合だけ成功とする。
    /// </summary>
    private static bool TryParseShelfNumber(string shelfId, out int shelfNumber)
    {
        shelfNumber = 0;

        if (string.IsNullOrWhiteSpace(shelfId))
        {
            return false;
        }

        string trimmed = shelfId.Trim();

        string numberPart = trimmed;
        const string prefix = "Shelf_";
        if (trimmed.Length > prefix.Length &&
            trimmed.Substring(0, prefix.Length).Equals(prefix, System.StringComparison.OrdinalIgnoreCase))
        {
            numberPart = trimmed.Substring(prefix.Length);
        }

        if (numberPart.Length == 0 || numberPart.Length > 2)
        {
            return false;
        }

        foreach (char c in numberPart)
        {
            if (!char.IsDigit(c))
            {
                return false;
            }
        }

        if (!int.TryParse(numberPart, out int parsed))
        {
            return false;
        }

        if (parsed < 1 || parsed > 8)
        {
            return false;
        }

        shelfNumber = parsed;
        return true;
    }
}
